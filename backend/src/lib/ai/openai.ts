import OpenAI from 'openai'
import type Anthropic from '@anthropic-ai/sdk'
import { getSystemPrompt } from './system-prompt.js'
import { allTools } from './tools/index.js'
import type { ToolContext } from './tools/index.js'
import { executeTool, isRiskyTool, getRiskyToolDescription } from './tools/index.js'
import type { PendingApproval } from './types.js'

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const MAX_TOKENS = 4096

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    _client = new OpenAI({ apiKey })
  }
  return _client
}

export function isOpenAIAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

// Convert Anthropic tool schema to OpenAI function format
export function getOpenAITools(): OpenAI.ChatCompletionTool[] {
  const tools = allTools as Array<{ name: string; description: string; input_schema: { type: string; properties?: Record<string, unknown>; required?: string[] } }>
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object' as const,
        properties: t.input_schema?.properties ?? {},
        required: t.input_schema?.required ?? [],
      },
    },
  }))
}

// Anthropic message format (what we store and what the agent loop uses)
type AnthropicMessage = Anthropic.MessageParam

// Convert our stored format (Anthropic-style) to OpenAI API format
function anthropicToOpenAIMessages(messages: AnthropicMessage[], systemPrompt: string): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      if (typeof m.content === 'string') {
        out.push({ role: 'user', content: m.content })
      } else if (Array.isArray(m.content)) {
        const toolResults = m.content as Anthropic.ToolResultBlockParam[]
        for (const tr of toolResults) {
          out.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id,
            content: tr.content,
          })
        }
      }
    } else if (m.role === 'assistant' && Array.isArray(m.content)) {
      const blocks = m.content as Anthropic.ContentBlock[]
      let text = ''
      const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = []
      for (const b of blocks) {
        if (b.type === 'text') text += (b as { text?: string }).text ?? ''
        if (b.type === 'tool_use') {
          const tu = b as Anthropic.ToolUseBlock
          toolCalls.push({
            id: tu.id,
            type: 'function',
            function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
          })
        }
      }
      out.push({
        role: 'assistant',
        content: text || undefined,
        tool_calls: toolCalls.length ? toolCalls : undefined,
      })
    }
  }
  return [{ role: 'system', content: systemPrompt }, ...out]
}

// Convert OpenAI assistant response back to Anthropic-style content blocks (for our message array and tool execution)
function openAIAssistantToAnthropicContent(
  content: string | null,
  toolCalls: OpenAI.ChatCompletionMessageToolCall[] | undefined,
): Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> {
  const blocks: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = []
  if (content && content.trim()) {
    blocks.push({ type: 'text', text: content })
  }
  if (toolCalls?.length) {
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
      } catch {
        //
      }
      blocks.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: args,
      })
    }
  }
  return blocks
}

export type ExpressResponse = import('express').Response

export type OpenAIAgentOptions = { model?: string }

export async function runOpenAIAgentLoop(
  res: ExpressResponse,
  messages: AnthropicMessage[],
  ctx: ToolContext,
  sendEvent: (res: ExpressResponse, data: object) => void,
  pendingApprovals: Map<string, PendingApproval>,
  randomUUID: () => string,
  options: OpenAIAgentOptions = {},
): Promise<void> {
  const client = getOpenAIClient()
  const systemPrompt = getSystemPrompt()
  const tools = getOpenAITools()
  const model = options.model?.trim() || DEFAULT_OPENAI_MODEL

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const openAIMessages = anthropicToOpenAIMessages(messages, systemPrompt)

    const stream = await client.chat.completions.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: openAIMessages,
      tools: tools.length ? tools : undefined,
      stream: true,
    })

    let content = ''
    const toolCallsAccum: Array<{ id: string; name: string; args: string }> = []

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue
      if (delta.content) {
        content += delta.content
        sendEvent(res, { type: 'text_delta', text: delta.content })
      }
      if (delta.tool_calls?.length) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0
          if (!toolCallsAccum[i]) toolCallsAccum[i] = { id: '', name: '', args: '' }
          if (tc.id) toolCallsAccum[i].id = tc.id
          if (tc.function?.name) toolCallsAccum[i].name = tc.function.name
          if (tc.function?.arguments) toolCallsAccum[i].args += tc.function.arguments
        }
      }
    }

    const finalToolCalls: OpenAI.ChatCompletionMessageToolCall[] = toolCallsAccum
      .filter((tc) => tc && tc.id && tc.name)
      .map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args || '{}' },
      }))

    const contentBlocks = openAIAssistantToAnthropicContent(content, finalToolCalls)
    messages.push({ role: 'assistant', content: contentBlocks })

    if (finalToolCalls.length === 0) {
      sendEvent(res, { type: 'done', messages })
      res.end()
      return
    }

    // Execute tools (same logic as Anthropic path)
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    let pendingRiskyTool: { block: { id: string; name: string; input: Record<string, unknown> }; input: Record<string, unknown> } | null = null

    for (const tc of finalToolCalls) {
      let toolInput: Record<string, unknown> = {}
      try {
        toolInput = JSON.parse(tc.function.arguments || '{}')
      } catch {
        //
      }

      if (isRiskyTool(tc.function.name)) {
        pendingRiskyTool = { block: { id: tc.id, name: tc.function.name, input: toolInput }, input: toolInput }
        break
      }

      sendEvent(res, { type: 'tool_use_start', tool_id: tc.id, tool_name: tc.function.name, tool_input: toolInput, requires_approval: false })
      const result = await executeTool(tc.function.name, toolInput, ctx)
      sendEvent(res, { type: 'tool_result', tool_id: tc.id, tool_name: tc.function.name, result: result.data, is_error: !result.success, error: result.error })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tc.id,
        content: result.success ? JSON.stringify(result.data) : JSON.stringify({ error: result.error }),
        is_error: !result.success,
      })
    }

    if (pendingRiskyTool) {
      const approvalId = randomUUID()
      const allToolUseBlocks: Anthropic.ToolUseBlock[] = finalToolCalls.map((tc) => {
        let input: Record<string, unknown> = {}
        try {
          input = JSON.parse(tc.function.arguments || '{}')
        } catch {
          //
        }
        return { type: 'tool_use' as const, id: tc.id, name: tc.function.name, input }
      })
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
      sendEvent(res, { type: 'done', messages, pending_approval_id: approvalId })
      res.end()
      return
    }

    messages.push({ role: 'user', content: toolResults })
  }
}
