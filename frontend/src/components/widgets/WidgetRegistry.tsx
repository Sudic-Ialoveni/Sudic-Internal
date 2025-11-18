import { ComponentType } from 'react'
import { WidgetConfig } from '@/lib/types/widgets'
import LiveLeadPreview from './LiveLeadPreview'
import AmoCRMAnalytics from './AmoCRMAnalytics'
import MoizvonkiAnalytics from './MoizvonkiAnalytics'
import TaritiGPTPrompt from './TaritiGPTPrompt'
import CustomHTML from './CustomHTML'
import MessageLog from './MessageLog'
import LeadTimeline from './LeadTimeline'
import MissingWidget from './MissingWidget'

export interface WidgetProps {
  settings?: Record<string, any>
  widgetId: string
}

// Widget registry - maps widget types to components
export const WIDGET_REGISTRY: Record<string, ComponentType<WidgetProps>> = {
  LiveLeadPreview,
  AmoCRMAnalytics,
  MoizvonkiAnalytics,
  TaritiGPTPrompt,
  CustomHTML,
  MessageLog,
  LeadTimeline,
}

export function getWidget(type: string): ComponentType<WidgetProps> {
  return WIDGET_REGISTRY[type] || MissingWidget
}

export function renderWidget(config: WidgetConfig) {
  const Widget = getWidget(config.type)
  return <Widget key={config.id} widgetId={config.id} settings={config.settings} />
}

