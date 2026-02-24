import { WidgetProps } from './WidgetRegistry'

export default function LeadTimeline(_settings: WidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] p-6 text-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-slate-700/60 border border-slate-700 flex items-center justify-center">
        <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">Lead Timeline</p>
        <p className="text-xs text-slate-600 mt-0.5">Coming soon</p>
      </div>
    </div>
  )
}
