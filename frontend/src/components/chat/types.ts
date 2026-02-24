export type ToolCallStatus = 'running' | 'done' | 'error' | 'pending_approval' | 'approved' | 'rejected'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolCallBlock {
  type: 'tool_call'
  toolId: string
  toolName: string
  toolInput: unknown
  result?: unknown
  error?: string
  status: ToolCallStatus
  approvalId?: string
  approvalDescription?: string
}

export type UIBlock = TextBlock | ToolCallBlock

export interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  blocks: UIBlock[]
  timestamp: Date
  isStreaming?: boolean
}

export interface PendingApproval {
  approvalId: string
  toolName: string
  toolInput: unknown
  description: string
}

// SSE event types from the backend
export type SSEEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; tool_id: string; tool_name: string; tool_input: unknown; requires_approval: boolean; approved?: boolean }
  | { type: 'tool_result'; tool_id: string; tool_name: string; result: unknown; is_error: boolean; error?: string }
  | { type: 'approval_required'; approval_id: string; tool_name: string; tool_input: unknown; description: string }
  | { type: 'tool_rejected'; tool_id: string; tool_name: string }
  | { type: 'done'; messages: ApiMessage[]; pending_approval_id?: string }
  | { type: 'error'; error: string }

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: unknown
}

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  list_pages: 'List Pages',
  get_page: 'Get Page',
  create_page: 'Create Page',
  update_page: 'Update Page',
  delete_page: 'Delete Page',
  get_leads: 'Get Leads',
  update_lead_status: 'Update Lead Status',
  forward_lead_to_amocrm: 'Forward to AmoCRM',
  get_amocrm_analytics: 'AmoCRM Analytics',
  get_moizvonki_analytics: 'Moizvonki Analytics',
  get_leads_analytics: 'Leads Analytics',
  call_amocrm_api: 'AmoCRM API Call',
  call_moizvonki_api: 'Moizvonki API Call',
  web_search: 'Web Search',
  run_code: 'Run Code',
}
