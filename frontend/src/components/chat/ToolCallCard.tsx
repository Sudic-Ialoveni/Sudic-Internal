import { useState } from 'react'
import { ToolCallBlock, TOOL_DISPLAY_NAMES } from './types'

interface ToolCallCardProps {
  block: ToolCallBlock
}

const TOOL_ICONS: Record<string, string> = {
  list_pages: '📄',
  get_page: '📄',
  create_page: '✨',
  update_page: '✏️',
  delete_page: '🗑️',
  get_leads: '👥',
  update_lead_status: '🔄',
  forward_lead_to_amocrm: '📤',
  get_amocrm_analytics: '📊',
  get_moizvonki_analytics: '📞',
  get_leads_analytics: '📈',
  call_amocrm_api: '🔌',
  call_moizvonki_api: '🔌',
  web_search: '🌐',
  run_code: '💻',
}

export function ToolCallCard({ block }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const displayName = TOOL_DISPLAY_NAMES[block.toolName] ?? block.toolName
  const icon = TOOL_ICONS[block.toolName] ?? '🔧'

  const statusConfig = {
    running: { dot: 'bg-amber-400 animate-pulse', label: 'Running...', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
    done: { dot: 'bg-emerald-400', label: 'Done', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    error: { dot: 'bg-rose-400', label: 'Error', border: 'border-rose-500/30', bg: 'bg-rose-500/5' },
    pending_approval: { dot: 'bg-violet-400 animate-pulse', label: 'Awaiting approval', border: 'border-violet-500/30', bg: 'bg-violet-500/5' },
    approved: { dot: 'bg-emerald-400', label: 'Approved', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    rejected: { dot: 'bg-rose-400', label: 'Rejected', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
  }[block.status]

  const hasResult = block.result !== undefined || block.error !== undefined
  const resultText = block.error
    ? block.error
    : typeof block.result === 'object'
      ? JSON.stringify(block.result, null, 2)
      : String(block.result ?? '')

  return (
    <div className={`my-1 rounded-xl border ${statusConfig.border} ${statusConfig.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-medium text-slate-200">{displayName}</span>
        <span className={`ml-auto h-2 w-2 rounded-full flex-shrink-0 ${statusConfig.dot}`} />
        <span className="text-xs text-slate-400 flex-shrink-0">{statusConfig.label}</span>
        {(hasResult || !!block.toolInput) && (
          <svg
            className={`h-3.5 w-3.5 text-slate-500 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2 space-y-2">
          {!!block.toolInput && (
            <div>
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Input</p>
              <pre className="text-xs text-slate-300 bg-slate-950/60 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(block.toolInput, null, 2)}
              </pre>
            </div>
          )}
          {hasResult && (
            <div>
              <p className={`text-xs mb-1 uppercase tracking-wide ${block.error ? 'text-rose-400' : 'text-slate-500'}`}>
                {block.error ? 'Error' : 'Result'}
              </p>
              <pre className={`text-xs rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-64 ${
                block.error ? 'bg-rose-950/40 text-rose-300' : 'text-slate-300 bg-slate-950/60'
              }`}>
                {resultText}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
