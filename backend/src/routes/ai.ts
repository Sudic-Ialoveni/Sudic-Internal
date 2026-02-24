import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'node:crypto'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { createServiceClient } from '../lib/supabase.js'
import { getClaudeClient, CLAUDE_MODEL, MAX_TOKENS } from '../lib/ai/claude.js'
import { getSystemPrompt } from '../lib/ai/system-prompt.js'
import { allTools, isRiskyTool, getRiskyToolDescription, executeTool, ToolContext } from '../lib/ai/tools/index.js'
import { runOpenAIAgentLoop, isOpenAIAvailable } from '../lib/ai/openai.js'
import type { PendingApproval } from '../lib/ai/types.js'
import type { UserPreferences } from './user.js'

const router = express.Router()

// ─── Pending approval store ───────────────────────────────────────────────────

const pendingApprovals = new Map<string, PendingApproval>()

// Clean up approvals older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [id, approval] of pendingApprovals) {
    if (approval.createdAt < cutoff) pendingApprovals.delete(id)
  }
}, 60 * 1000)

// ─── SSE helpers ─────────────────────────────────────────────────────────────

function initSSE(res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

function sendEvent(res: express.Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

// Send a comment-line keep-alive so proxies/browsers don't close the connection
// while Claude is generating a long response (e.g. a page config with chart data).
function startKeepAlive(res: express.Response): ReturnType<typeof setInterval> {
  return setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n')
  }, 15_000)
}

const MAX_CLAUDE_RETRIES = 4
const RETRY_BASE_MS = 1500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableClaudeError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (lower.includes('overloaded') || lower.includes('rate_limit') || lower.includes('rate limit')) return true
  try {
    const parsed = JSON.parse(msg) as { error?: { type?: string }; status?: number }
    const type = parsed?.error?.type
    const status = parsed?.status ?? (err as { status?: number })?.status
    if (type === 'overloaded_error' || type === 'rate_limit_error') return true
    if (status === 503 || status === 529) return true
  } catch {
    /* not JSON */
  }
  return false
}

// Turn Anthropic API errors into user-friendly messages (e.g. overloaded, rate limit).
function formatClaudeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.toLowerCase().includes('overloaded')) {
    return "Claude's servers are busy right now. Please try again in a moment."
  }
  if (msg.toLowerCase().includes('rate_limit') || msg.toLowerCase().includes('rate limit')) {
    return "Rate limit reached. Please wait a moment before trying again."
  }
  // Anthropic SDK sometimes embeds JSON in the message
  try {
    const parsed = JSON.parse(msg) as { error?: { type?: string; message?: string }; type?: string; message?: string }
    const type = parsed?.error?.type ?? parsed?.type
    const detail = parsed?.error?.message ?? parsed?.message
    if (type === 'overloaded_error' || (detail && String(detail).toLowerCase().includes('overloaded'))) {
      return "Claude's servers are busy right now. Please try again in a moment."
    }
    if (type === 'rate_limit_error') {
      return "Rate limit reached. Please wait a moment before trying again."
    }
    if (detail && typeof detail === 'string') return detail
  } catch {
    // not JSON, use raw message
  }
  return msg
}

// ─── Sanitize messages ────────────────────────────────────────────────────────
// When a chat is saved mid-turn (e.g. pending approval) the stored messages may
// contain an assistant message with tool_use blocks that have no corresponding
// tool_result in the next user message. Claude rejects such conversations with a
// 400. We fix this by injecting stub error tool_results for any dangling blocks.

function sanitizeMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    result.push(msg)

    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const toolUseBlocks = (msg.content as Anthropic.ContentBlock[]).filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      if (toolUseBlocks.length > 0) {
        const next = messages[i + 1]
        const nextHasResults =
          next?.role === 'user' &&
          Array.isArray(next.content) &&
          (next.content as Anthropic.ContentBlockParam[]).some(b => b.type === 'tool_result')

        if (!nextHasResults) {
          // Inject stub tool_results so the conversation is structurally valid
          const stubResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(b => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: JSON.stringify({ error: 'This tool call was interrupted and did not complete.' }),
            is_error: true,
          }))
          result.push({ role: 'user', content: stubResults })
        }
      }
    }
  }

  return result
}

// ─── Core agent loop ─────────────────────────────────────────────────────────

async function runAgentLoop(
  res: express.Response,
  messages: Anthropic.MessageParam[],
  ctx: ToolContext,
) {
  const client = getClaudeClient()

  while (true) {
    // Stream Claude's response — retry on overload/rate-limit so we "always have Claude"
    let stream!: Awaited<ReturnType<typeof client.messages.stream>>
    let attempt = 0
    while (attempt <= MAX_CLAUDE_RETRIES) {
      try {
        stream = await client.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system: getSystemPrompt(),
          tools: allTools,
          messages: sanitizeMessages(messages),
        })
        break
      } catch (err) {
        if (!isRetryableClaudeError(err) || attempt === MAX_CLAUDE_RETRIES) throw err
        const delay = RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * 500
        await sleep(delay)
        attempt++
      }
    }

    // Track current tool_use blocks being built
    const toolBlocks: Record<string, { id: string; name: string; inputJson: string }> = {}
    let currentBlockIndex = -1
    let currentBlockType = ''

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        currentBlockIndex = event.index
        currentBlockType = event.content_block.type

        if (event.content_block.type === 'tool_use') {
          toolBlocks[event.index] = {
            id: event.content_block.id,
            name: event.content_block.name,
            inputJson: '',
          }
          // Don't announce tool_use start yet — wait until we have the full input
        }
      }

      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          sendEvent(res, { type: 'text_delta', text: event.delta.text })
        }
        if (event.delta.type === 'input_json_delta' && toolBlocks[event.index]) {
          toolBlocks[event.index].inputJson += event.delta.partial_json
        }
      }

      if (event.type === 'content_block_stop') {
        if (currentBlockType === 'tool_use' && toolBlocks[currentBlockIndex]) {
          // Parse accumulated JSON
          const block = toolBlocks[currentBlockIndex]
          let toolInput: Record<string, unknown> = {}
          try {
            toolInput = JSON.parse(block.inputJson || '{}')
          } catch {
            toolInput = {}
          }
          block.inputJson = '' // Free memory
          ;(block as unknown as Record<string, unknown>).parsedInput = toolInput
        }
      }
    }

    // Get the final message
    const finalMessage = await stream.finalMessage()
    messages.push({ role: 'assistant', content: finalMessage.content })

    if (finalMessage.stop_reason !== 'tool_use') {
      // No more tool calls — we're done
      sendEvent(res, { type: 'done', messages })
      res.end()
      return
    }

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    let pendingRiskyTool: { block: Anthropic.ToolUseBlock; input: Record<string, unknown> } | null = null

    for (const block of finalMessage.content) {
      if (block.type !== 'tool_use') continue

      const toolInput = block.input as Record<string, unknown>

      if (isRiskyTool(block.name)) {
        // Pause for human approval on the first risky tool encountered
        pendingRiskyTool = { block, input: toolInput }
        break
      }

      // Safe tool — execute immediately
      sendEvent(res, {
        type: 'tool_use_start',
        tool_id: block.id,
        tool_name: block.name,
        tool_input: toolInput,
        requires_approval: false,
      })

      const result = await executeTool(block.name, toolInput, ctx)

      sendEvent(res, {
        type: 'tool_result',
        tool_id: block.id,
        tool_name: block.name,
        result: result.data,
        is_error: !result.success,
        error: result.error,
      })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.success
          ? JSON.stringify(result.data)
          : JSON.stringify({ error: result.error }),
        is_error: !result.success,
      })
    }

    if (pendingRiskyTool) {
      // Store pending approval state (messages include current assistant turn already).
      // Store all tool_use blocks and results so far so on approve/reject we can send
      // one user message with a tool_result for every tool_use (API requirement).
      const approvalId = randomUUID()
      const allToolUseBlocks = (finalMessage.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      ))

      pendingApprovals.set(approvalId, {
        id: approvalId,
        messages,
        toolUseId: pendingRiskyTool.block.id,
        toolName: pendingRiskyTool.block.name,
        toolInput: pendingRiskyTool.input,
        userId: ctx.userId,
        authToken: ctx.authToken,
        createdAt: Date.now(),
        allToolUseBlocks,
        resultsSoFar: toolResults,
      })

      sendEvent(res, {
        type: 'approval_required',
        approval_id: approvalId,
        tool_name: pendingRiskyTool.block.name,
        tool_input: pendingRiskyTool.input,
        description: getRiskyToolDescription(pendingRiskyTool.block.name, pendingRiskyTool.input),
      })

      // End stream here — frontend must resume via /approve or /reject
      sendEvent(res, { type: 'done', messages, pending_approval_id: approvalId })
      res.end()
      return
    }

    // Continue loop with tool results
    messages.push({ role: 'user', content: toolResults })
  }
}

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle() as { data: { preferences: UserPreferences } | null }
  const prefs = data?.preferences ?? {}
  return {
    ai_provider: prefs.ai_provider ?? 'anthropic',
    openai_fallback_enabled: prefs.openai_fallback_enabled ?? true,
    openai_model: prefs.openai_model,
  }
}

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────

router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization
  const authToken = authHeader?.substring(7) ?? ''

  const { messages } = req.body as { messages: Anthropic.MessageParam[] }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  initSSE(res)

  const ctx: ToolContext = {
    authToken,
    userId: req.user!.id,
  }

  const prefs = await getUserPreferences(req.user!.id)
  const useOpenAIFallback = (prefs.ai_provider === 'anthropic_with_openai_fallback' || prefs.openai_fallback_enabled) && isOpenAIAvailable()
  const primaryOpenAI = prefs.ai_provider === 'openai'

  const keepAlive = startKeepAlive(res)
  try {
    if (primaryOpenAI && isOpenAIAvailable()) {
      await runOpenAIAgentLoop(res, [...messages], ctx, sendEvent, pendingApprovals, randomUUID, { model: prefs.openai_model })
    } else {
      await runAgentLoop(res, [...messages], ctx)
    }
  } catch (err: unknown) {
    if (useOpenAIFallback && !primaryOpenAI && isOpenAIAvailable() && !res.writableEnded) {
      try {
        await runOpenAIAgentLoop(res, [...messages], ctx, sendEvent, pendingApprovals, randomUUID, { model: prefs.openai_model })
        return
      } catch (fallbackErr) {
        console.error('OpenAI fallback error:', fallbackErr)
      }
    }
    console.error('Agent error:', err)
    const message = formatClaudeErrorMessage(err)
    if (!res.writableEnded) {
      sendEvent(res, { type: 'error', error: message })
      sendEvent(res, { type: 'done', messages })
      res.end()
    }
  } finally {
    clearInterval(keepAlive)
  }
})

// ─── POST /api/ai/approve ─────────────────────────────────────────────────────

router.post('/approve', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { approval_id } = req.body as { approval_id: string }

  const pending = pendingApprovals.get(approval_id)
  if (!pending) {
    return res.status(404).json({ error: 'Approval request not found or expired' })
  }

  // Verify ownership
  if (pending.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  pendingApprovals.delete(approval_id)

  initSSE(res)

  const ctx: ToolContext = {
    authToken: pending.authToken,
    userId: pending.userId,
  }

  sendEvent(res, {
    type: 'tool_use_start',
    tool_id: pending.toolUseId,
    tool_name: pending.toolName,
    tool_input: pending.toolInput,
    requires_approval: true,
    approved: true,
  })

  const keepAlive = startKeepAlive(res)
  try {
    const result = await executeTool(pending.toolName, pending.toolInput, ctx)

    sendEvent(res, {
      type: 'tool_result',
      tool_id: pending.toolUseId,
      tool_name: pending.toolName,
      result: result.data,
      is_error: !result.success,
      error: result.error,
    })

    const approvedResult: Anthropic.ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: pending.toolUseId,
      content: result.success
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error }),
      is_error: !result.success,
    }

    // API requires a tool_result for every tool_use in the previous assistant message.
    const allBlocks = pending.allToolUseBlocks ?? []
    const resultsSoFar = pending.resultsSoFar ?? []
    const stubForSkipped = (block: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify({
        error: 'Skipped; please request this tool again in a separate message.',
        skipped: true,
      }),
      is_error: true,
    })
    const remainingBlocks = allBlocks.slice(resultsSoFar.length + 1)
    const fullToolResults: Anthropic.ToolResultBlockParam[] = [
      ...resultsSoFar,
      approvedResult,
      ...remainingBlocks.map(stubForSkipped),
    ]

    const messages = [...pending.messages, { role: 'user' as const, content: fullToolResults }]
    await runAgentLoop(res, messages, ctx)
  } catch (err: unknown) {
    console.error('Approve error:', err)
    const message = formatClaudeErrorMessage(err)
    if (!res.writableEnded) {
      sendEvent(res, { type: 'error', error: message })
      sendEvent(res, { type: 'done', messages: pending.messages })
      res.end()
    }
  } finally {
    clearInterval(keepAlive)
  }
})

// ─── POST /api/ai/reject ──────────────────────────────────────────────────────

router.post('/reject', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { approval_id, reason } = req.body as { approval_id: string; reason?: string }

  const pending = pendingApprovals.get(approval_id)
  if (!pending) {
    return res.status(404).json({ error: 'Approval request not found or expired' })
  }

  if (pending.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  pendingApprovals.delete(approval_id)

  initSSE(res)

  const ctx: ToolContext = {
    authToken: pending.authToken,
    userId: pending.userId,
  }

  sendEvent(res, {
    type: 'tool_rejected',
    tool_id: pending.toolUseId,
    tool_name: pending.toolName,
  })

  const keepAlive = startKeepAlive(res)
  try {
    const rejectResult: Anthropic.ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: pending.toolUseId,
      content: JSON.stringify({
        error: `User rejected this operation.${reason ? ` Reason: ${reason}` : ''}`,
      }),
      is_error: true,
    }
    const allBlocks = pending.allToolUseBlocks ?? []
    const resultsSoFar = pending.resultsSoFar ?? []
    const stubForSkipped = (block: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify({
        error: 'Skipped; please request this tool again in a separate message.',
        skipped: true,
      }),
      is_error: true,
    })
    const remainingBlocks = allBlocks.slice(resultsSoFar.length + 1)
    const fullToolResults: Anthropic.ToolResultBlockParam[] = [
      ...resultsSoFar,
      rejectResult,
      ...remainingBlocks.map(stubForSkipped),
    ]

    const messages = [...pending.messages, { role: 'user' as const, content: fullToolResults }]
    await runAgentLoop(res, messages, ctx)
  } catch (err: unknown) {
    console.error('Reject error:', err)
    const message = formatClaudeErrorMessage(err)
    if (!res.writableEnded) {
      sendEvent(res, { type: 'error', error: message })
      sendEvent(res, { type: 'done', messages: pending.messages })
      res.end()
    }
  } finally {
    clearInterval(keepAlive)
  }
})

export default router
