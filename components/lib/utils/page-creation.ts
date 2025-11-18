/**
 * Utility functions for creating and managing dashboard pages programmatically.
 * Useful for TaritiGPT integration and automated page generation.
 */

import { PageConfig, WidgetConfig, WidgetType } from '@/components/lib/types/widgets'

export interface CreatePageOptions {
  slug: string
  title: string
  description?: string
  config: PageConfig
  published?: boolean
}

/**
 * Validates a page configuration
 */
export function validatePageConfig(config: PageConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.widgets || !Array.isArray(config.widgets)) {
    errors.push('Widgets must be an array')
    return { valid: false, errors }
  }

  if (config.widgets.length === 0) {
    errors.push('At least one widget is required')
  }

  config.widgets.forEach((widget, index) => {
    if (!widget.id) {
      errors.push(`Widget at index ${index} is missing an id`)
    }
    if (!widget.type) {
      errors.push(`Widget at index ${index} is missing a type`)
    }
    if (!Object.values(WidgetType).includes(widget.type as WidgetType)) {
      errors.push(`Widget at index ${index} has invalid type: ${widget.type}`)
    }
    if (widget.colSpan < 1 || widget.colSpan > 12) {
      errors.push(`Widget at index ${index} has invalid colSpan: ${widget.colSpan}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Creates a default page configuration with common widgets
 */
export function createDefaultPageConfig(): PageConfig {
  return {
    layout: {
      cols: 12,
      gap: 4,
    },
    widgets: [
      {
        id: 'w1',
        type: WidgetType.LiveLeadPreview,
        colSpan: 12,
        settings: {
          showActions: true,
        },
      },
    ],
  }
}

/**
 * Helper to create a widget configuration
 */
export function createWidget(
  type: WidgetType,
  colSpan: number = 12,
  settings?: Record<string, any>
): WidgetConfig {
  return {
    id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    colSpan,
    settings,
  }
}

/**
 * Example: Create a page via API (for TaritiGPT or other integrations)
 */
export async function createPageViaAPI(options: CreatePageOptions, authToken?: string) {
  const validation = validatePageConfig(options.config)
  if (!validation.valid) {
    throw new Error(`Invalid page config: ${validation.errors.join(', ')}`)
  }

  const response = await fetch('/api/pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    body: JSON.stringify({
      slug: options.slug,
      title: options.title,
      description: options.description,
      config: options.config,
      published: options.published || false,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create page')
  }

  return response.json()
}

/**
 * Example page configurations for common use cases
 */
export const exampleConfigs = {
  /**
   * Analytics dashboard
   */
  analyticsDashboard: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.AmoCRMAnalytics, 6),
      createWidget(WidgetType.MoizvonkiAnalytics, 6),
      createWidget(WidgetType.LiveLeadPreview, 12, { showActions: true }),
    ],
  }),

  /**
   * Lead management dashboard
   */
  leadManagement: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.LiveLeadPreview, 8, { showActions: true }),
      createWidget(WidgetType.LeadTimeline, 4),
      createWidget(WidgetType.MessageLog, 12),
    ],
  }),

  /**
   * AI assistant dashboard
   */
  aiAssistant: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.TaritiGPTPrompt, 12),
      createWidget(WidgetType.LiveLeadPreview, 6),
      createWidget(WidgetType.AmoCRMAnalytics, 6),
    ],
  }),
}

