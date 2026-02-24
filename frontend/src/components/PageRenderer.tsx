import { PageConfig } from '@/lib/types/widgets'
import { renderWidget } from './widgets/WidgetRegistry'

interface PageRendererProps {
  config: PageConfig
  title?: string
  description?: string
}

export default function PageRenderer({ config, title, description }: PageRendererProps) {
  const gap = config.layout?.gap ?? 4

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      {(title || description) && (
        <div className="px-6 pt-6 pb-2">
          {title && <h1 className="text-xl font-semibold text-white">{title}</h1>}
          {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
        </div>
      )}

      <div
        className="p-6 grid grid-cols-12"
        style={{ gap: `${gap * 0.25}rem` }}
      >
        {config.widgets.map((widget) => {
          const colSpan = Math.min(Math.max(widget.colSpan ?? 12, 1), 12)

          return (
            <div
              key={widget.id}
              className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col min-w-0"
              style={{ gridColumn: `span ${colSpan}` }}
            >
              {renderWidget(widget)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
