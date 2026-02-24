import Anthropic from '@anthropic-ai/sdk'
import { pageTools, handleListPages, handleGetPage, handleCreatePage, handleUpdatePage, handleDeletePage } from './pages.js'
import { leadTools, handleGetLeads, handleUpdateLeadStatus, handleForwardLeadToAmocrm } from './leads.js'
import { analyticsTools, handleGetAmocrmAnalytics, handleGetMoizvonkiAnalytics, handleGetLeadsAnalytics } from './analytics.js'
import { externalValueTools, handleGetExternalValue } from './external-value.js'
import { webSearchTools, handleWebSearch } from './web-search.js'
import { codeExecTools, handleRunCode } from './code-exec.js'

export interface ToolContext {
  authToken: string
  userId: string
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// All tool definitions for Claude
export const allTools: Anthropic.Tool[] = [
  ...pageTools,
  ...leadTools,
  ...analyticsTools,
  ...externalValueTools,
  ...webSearchTools,
  ...codeExecTools,
]

// Tools that require human approval before execution
const RISKY_TOOLS = new Set([
  'create_page',
  'update_page',
  'delete_page',
  'update_lead_status',
  'forward_lead_to_amocrm',
])

export function isRiskyTool(toolName: string): boolean {
  return RISKY_TOOLS.has(toolName)
}

// Human-readable descriptions for risky tool approval cards
export function getRiskyToolDescription(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'create_page':
      return `Create a new dashboard page titled "${toolInput.title}" with ${(toolInput.config as { widgets?: unknown[] })?.widgets?.length ?? 0} widget(s)`
    case 'update_page':
      return `Update page "${toolInput.slug}"${toolInput.config ? ' (including widget layout)' : ''}${toolInput.published !== undefined ? ` and set published = ${toolInput.published}` : ''}`
    case 'delete_page':
      return `Permanently delete page "${toolInput.slug}" — this cannot be undone`
    case 'update_lead_status':
      return `Change lead ${toolInput.lead_id} status to "${toolInput.status}"${toolInput.reason ? ` — reason: ${toolInput.reason}` : ''}`
    case 'forward_lead_to_amocrm':
      return `Forward lead ${toolInput.lead_id} to AmoCRM and mark it as "forwarded"`
    default:
      return `Execute tool: ${toolName}`
  }
}

// Execute a tool by name
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  switch (toolName) {
    case 'list_pages':
      return handleListPages(toolInput as Parameters<typeof handleListPages>[0], ctx)
    case 'get_page':
      return handleGetPage(toolInput as Parameters<typeof handleGetPage>[0], ctx)
    case 'create_page':
      return handleCreatePage(toolInput as Parameters<typeof handleCreatePage>[0], ctx)
    case 'update_page':
      return handleUpdatePage(toolInput as Parameters<typeof handleUpdatePage>[0], ctx)
    case 'delete_page':
      return handleDeletePage(toolInput as Parameters<typeof handleDeletePage>[0], ctx)
    case 'get_leads':
      return handleGetLeads(toolInput as Parameters<typeof handleGetLeads>[0], ctx)
    case 'update_lead_status':
      return handleUpdateLeadStatus(toolInput as Parameters<typeof handleUpdateLeadStatus>[0], ctx)
    case 'forward_lead_to_amocrm':
      return handleForwardLeadToAmocrm(toolInput as Parameters<typeof handleForwardLeadToAmocrm>[0], ctx)
    case 'get_amocrm_analytics':
      return handleGetAmocrmAnalytics(toolInput as Parameters<typeof handleGetAmocrmAnalytics>[0], ctx)
    case 'get_moizvonki_analytics':
      return handleGetMoizvonkiAnalytics(toolInput as Parameters<typeof handleGetMoizvonkiAnalytics>[0], ctx)
    case 'get_leads_analytics':
      return handleGetLeadsAnalytics(toolInput as Parameters<typeof handleGetLeadsAnalytics>[0], ctx)
    case 'get_external_value':
      return handleGetExternalValue(toolInput as Parameters<typeof handleGetExternalValue>[0], ctx)
    case 'web_search':
      return handleWebSearch(toolInput as Parameters<typeof handleWebSearch>[0], ctx)
    case 'run_code':
      return handleRunCode(toolInput as Parameters<typeof handleRunCode>[0], ctx)
    default:
      return { success: false, error: `Unknown tool: ${toolName}` }
  }
}
