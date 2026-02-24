import { useState } from 'react'
import { TOOL_DISPLAY_NAMES, ToolCallBlock } from './types'

interface ApprovalCardProps {
  block: ToolCallBlock
  onApprove: (approvalId: string) => void
  onReject: (approvalId: string, reason?: string) => void
}

const RISKY_TOOL_ICONS: Record<string, string> = {
  create_page: '✨',
  update_page: '✏️',
  delete_page: '🗑️',
  update_lead_status: '🔄',
  forward_lead_to_amocrm: '📤',
  call_amocrm_api: '🔌',
  call_moizvonki_api: '🔌',
}

const RISKY_TOOL_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  delete_page: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', badge: 'bg-rose-500/20 text-rose-300' },
  forward_lead_to_amocrm: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300' },
  call_amocrm_api: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300' },
  call_moizvonki_api: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300' },
}

const DEFAULT_COLORS = { bg: 'bg-violet-500/10', border: 'border-violet-500/30', badge: 'bg-violet-500/20 text-violet-300' }

export function ApprovalCard({ block, onApprove, onReject }: ApprovalCardProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  if (!block.approvalId || !block.approvalDescription) return null

  const displayName = TOOL_DISPLAY_NAMES[block.toolName] ?? block.toolName
  const icon = RISKY_TOOL_ICONS[block.toolName] ?? '⚠️'
  const colors = RISKY_TOOL_COLORS[block.toolName] ?? DEFAULT_COLORS
  const isDone = block.status === 'approved' || block.status === 'rejected'

  if (isDone) {
    return (
      <div className={`my-2 rounded-xl border px-4 py-3 flex items-center gap-3 ${
        block.status === 'approved'
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-rose-500/20 bg-rose-500/5'
      }`}>
        <span className="text-sm">{block.status === 'approved' ? '✅' : '❌'}</span>
        <div>
          <p className="text-sm font-medium text-slate-200">{displayName}</p>
          <p className={`text-xs ${block.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {block.status === 'approved' ? 'Approved and executed' : 'Rejected'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`my-2 rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                Requires your approval
              </span>
              <span className="text-sm font-semibold text-slate-100">{displayName}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-200 leading-relaxed">
              {block.approvalDescription}
            </p>
            {!!block.toolInput && (
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                  View details
                </summary>
                <pre className="mt-1 text-xs text-slate-400 bg-slate-950/60 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-40">
                  {JSON.stringify(block.toolInput, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>

        {showRejectInput ? (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejecting (optional)"
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onReject(block.approvalId!, rejectReason || undefined)
                if (e.key === 'Escape') setShowRejectInput(false)
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => onReject(block.approvalId!, rejectReason || undefined)}
                className="flex-1 rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-500/30 transition-colors"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onApprove(block.approvalId!)}
              className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectInput(true)}
              className="flex-1 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
