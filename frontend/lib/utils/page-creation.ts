/**
 * Utility functions for creating and managing dashboard pages programmatically.
 * Useful for TaritiGPT integration and automated page generation.
 */

import { PageConfig, WidgetConfig, WidgetType } from '@/lib/types/widgets'

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
 * Default page configurations
 */
export const defaultConfigs = {
  /**
   * TaritiGPT Dashboard
   */
  taritiGPT: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.TaritiGPTPrompt, 12, {
        showHistory: true,
        showExamples: true,
      }),
      createWidget(WidgetType.LiveLeadPreview, 6, { showActions: true }),
      createWidget(WidgetType.LeadTimeline, 6),
    ],
  }),

  /**
   * Website Analytics (Sudic.md)
   */
  websiteAnalytics: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.CustomHTML, 6, {
        title: 'Sudic 1 - Vizitatori',
        html: '<div class="p-4 bg-white rounded-lg shadow"><h3 class="text-lg font-medium mb-2">Sudic 1 - Vizitatori</h3><p class="text-2xl font-bold">Se încarcă...</p></div>',
      }),
      createWidget(WidgetType.CustomHTML, 6, {
        title: 'Sudic 2 - Vizitatori',
        html: '<div class="p-4 bg-white rounded-lg shadow"><h3 class="text-lg font-medium mb-2">Sudic 2 - Vizitatori</h3><p class="text-2xl font-bold">Se încarcă...</p></div>',
      }),
    ],
  }),

  /**
   * Moizvonki Analytics
   */
  moizvonkiAnalytics: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.MoizvonkiAnalytics, 4, {
        title: 'Sunete de intrare',
        dateRange: '7d',
        type: 'inbound'
      }),
      createWidget(WidgetType.MoizvonkiAnalytics, 4, {
        title: 'Sunete ratate',
        dateRange: '7d',
        type: 'missed'
      }),
      createWidget(WidgetType.MoizvonkiAnalytics, 4, {
        title: 'Sunete de ieșire',
        dateRange: '7d',
        type: 'outbound'
      }),
    ],
  }),

  /**
   * AmoCRM Analytics
   */
  amocrmAnalytics: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.AmoCRMAnalytics, 3, {
        title: 'Total Imobile',
        metric: 'total_properties',
      }),
      createWidget(WidgetType.AmoCRMAnalytics, 3, {
        title: 'M² Total',
        metric: 'total_area',
      }),
      createWidget(WidgetType.AmoCRMAnalytics, 3, {
        title: 'Imobile Tranzacționate',
        metric: 'sold_properties',
      }),
      createWidget(WidgetType.AmoCRMAnalytics, 3, {
        title: 'M² Tranzacționat',
        metric: 'sold_area',
      }),
      createWidget(WidgetType.AmoCRMAnalytics, 6, {
        title: 'Imobile Rămase',
        metric: 'remaining_properties',
      }),
      createWidget(WidgetType.AmoCRMAnalytics, 6, {
        title: 'M² Rămași',
        metric: 'remaining_area',
      }),
    ],
  }),

  /**
   * AI Custom Page Builder
   */
  aiPageBuilder: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.CustomHTML, 12, {
        title: 'AI Page Builder',
        html: `
          <div class="p-6 bg-white rounded-lg shadow">
            <h2 class="text-2xl font-bold mb-4">AI Page Builder</h2>
            <p class="mb-4">Creează pagini personalizate folosind AI-ul nostru.</p>
            <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Creează Pagină Nouă
            </button>
          </div>
        `,
      }),
    ],
  }),

  /**
   * Custom Pages Manager
   */
  customPages: (): PageConfig => ({
    layout: { cols: 12, gap: 4 },
    widgets: [
      createWidget(WidgetType.CustomHTML, 12, {
        title: 'Gestionare Pagini Personalizate',
        html: `
          <div class="p-6 bg-white rounded-lg shadow">
            <h2 class="text-2xl font-bold mb-4">Pagini Personalizate</h2>
            <p class="mb-4">Gestionează toate paginile tale personalizate într-un singur loc.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="custom-pages-list">
              <div class="p-4 border rounded-lg">
                <h3 class="font-medium">Fără pagini personalizate</h3>
                <p class="text-sm text-gray-500">Apasă pe butonul de mai jos pentru a crea o pagină nouă</p>
              </div>
            </div>
            <button class="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              + Pagină Nouă
            </button>
          </div>
        `,
      }),
    ],
  }),
}

