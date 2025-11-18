'use client'

import { PageConfig } from '@/components/lib/types/widgets'
import { renderWidget } from './widgets/WidgetRegistry'

interface PageRendererProps {
  config: PageConfig
}

export default function PageRenderer({ config }: PageRendererProps) {
  const layout = config.layout || { cols: 12, gap: 4 }
  const gap = layout.gap || 4
  const cols = layout.cols || 12

  return (
    <div 
      className="p-4"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {config.widgets.map((widget) => (
        <div
          key={widget.id}
          className="bg-white rounded-lg shadow-sm border p-4"
          style={{
            gridColumn: `span ${widget.colSpan} / span ${widget.colSpan}`,
            minHeight: '200px',
          }}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  )
}

