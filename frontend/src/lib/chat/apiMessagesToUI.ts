import type { UIMessage, UIBlock, ApiMessage } from '@/components/chat/types'

interface ContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: unknown
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id?: string
  content?: string
  is_error?: boolean
}

export function apiMessagesToUIMessages(messages: ApiMessage[]): UIMessage[] {
  const out: UIMessage[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role === 'user') {
      if (typeof m.content === 'string') {
        out.push({
          id: crypto.randomUUID(),
          role: 'user',
          blocks: [{ type: 'text', text: m.content }],
          timestamp: new Date(),
        })
      }
      continue
    }
    if (m.role === 'assistant' && Array.isArray(m.content)) {
      const content = m.content as ContentBlock[]
      const next = messages[i + 1]
      const toolResults = (next?.role === 'user' && Array.isArray(next.content)
        ? next.content
        : []) as ToolResultBlock[]

      const blocks: UIBlock[] = []
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          blocks.push({ type: 'text', text: block.text })
        }
        if (block.type === 'tool_use') {
          const tr = toolResults.find(r => r.tool_use_id === block.id)
          let result: unknown
          let error: string | undefined
          try {
            if (tr?.content) result = JSON.parse(tr.content)
            if (tr?.is_error && tr?.content) error = typeof result === 'object' && result && 'error' in result ? String((result as { error: string }).error) : tr.content
          } catch {
            result = tr?.content
            error = tr?.is_error ? String(tr?.content) : undefined
          }
          blocks.push({
            type: 'tool_call',
            toolId: block.id ?? '',
            toolName: block.name ?? '',
            toolInput: block.input ?? {},
            result,
            error,
            status: tr ? (tr.is_error ? 'error' : 'done') : 'running',
          })
        }
      }
      if (blocks.length) {
        out.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          blocks,
          timestamp: new Date(),
        })
      }
    }
  }
  return out
}
