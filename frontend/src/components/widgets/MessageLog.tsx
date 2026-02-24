import { WidgetProps } from './WidgetRegistry'

export default function MessageLog(_settings: WidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] p-6 text-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-slate-700/60 border border-slate-700 flex items-center justify-center">
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">Message Log</p>
        <p className="text-xs text-slate-600 mt-0.5">Coming soon</p>
      </div>
    </div>
  )
}
