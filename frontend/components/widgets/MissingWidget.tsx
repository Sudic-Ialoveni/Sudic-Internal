'use client'

import { WidgetProps } from './WidgetRegistry'

export default function MissingWidget({ widgetId, settings }: WidgetProps) {
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <p className="text-sm text-gray-500">
        Widget type not found: {settings?.type || 'unknown'}
      </p>
      <p className="text-xs text-gray-400 mt-1">Widget ID: {widgetId}</p>
    </div>
  )
}

