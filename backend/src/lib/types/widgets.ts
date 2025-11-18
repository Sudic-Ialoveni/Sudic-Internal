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

