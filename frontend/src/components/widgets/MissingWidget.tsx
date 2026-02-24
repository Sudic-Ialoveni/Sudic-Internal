import { WidgetProps } from './WidgetRegistry'

export default function MissingWidget({ widgetId, settings }: WidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] p-5 text-center gap-2">
      <div className="h-8 w-8 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center">
        <span className="text-slate-600 text-xs">?</span>
      </div>
      <p className="text-xs text-slate-500">Unknown widget: <span className="text-slate-400">{(settings as Record<string,string>)?.type || 'unknown'}</span></p>
      <p className="text-[10px] text-slate-600">{widgetId}</p>
    </div>
  )
}
