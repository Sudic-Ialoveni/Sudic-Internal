import type Anthropic from '@anthropic-ai/sdk'

export interface PendingApproval {
  id: string
  messages: Anthropic.MessageParam[]
  toolUseId: string
  toolName: string
  toolInput: Record<string, unknown>
  userId: string
  authToken: string
  createdAt: number
  /** All tool_use blocks from the assistant message (so we can send a tool_result for each on resume) */
  allToolUseBlocks: Anthropic.ToolUseBlock[]
  /** Tool results already collected for tool_uses we ran before pausing */
  resultsSoFar: Anthropic.ToolResultBlockParam[]
}
