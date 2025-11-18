import { z } from 'zod'

// Widget configuration schema
export const WidgetConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  colSpan: z.number().min(1).max(12).default(12),
  rowSpan: z.number().min(1).optional(),
  settings: z.record(z.any()).optional(),
})

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>

// Page configuration schema
export const PageConfigSchema = z.object({
  layout: z.object({
    cols: z.number().default(12),
    gap: z.number().default(4),
  }).optional(),
  widgets: z.array(WidgetConfigSchema),
})

export type PageConfig = z.infer<typeof PageConfigSchema>

// Widget types enum
export enum WidgetType {
  LiveLeadPreview = 'LiveLeadPreview',
  AmoCRMAnalytics = 'AmoCRMAnalytics',
  MoizvonkiAnalytics = 'MoizvonkiAnalytics',
  TaritiGPTPrompt = 'TaritiGPTPrompt',
  CustomHTML = 'CustomHTML',
  MessageLog = 'MessageLog',
  LeadTimeline = 'LeadTimeline',
}

// Widget-specific settings types
export interface LiveLeadPreviewSettings {
  initialFilter?: {
    status?: string
    source?: string
  }
  showActions?: boolean
}

export interface AmoCRMAnalyticsSettings {
  dateRange?: {
    start: string
    end: string
  }
  metrics?: string[]
}

export interface MoizvonkiAnalyticsSettings {
  dateRange?: {
    start: string
    end: string
  }
  showCallDetails?: boolean
}

export interface CustomHTMLSettings {
  html: string
  allowScripts?: boolean
}

