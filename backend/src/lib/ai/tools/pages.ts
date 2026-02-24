import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '../../supabase.js'
import { PageConfigSchema } from '../../types/widgets.js'
import type { ToolContext, ToolResult } from './index.js'

const DEFAULT_PAGE_CONFIG = {
  layout: { cols: 12, gap: 4 },
  widgets: [] as Array<{ id: string; type: string; colSpan: number; rowSpan?: number; settings?: object }>,
}

export const pageTools: Anthropic.Tool[] = [
  {
    name: 'list_pages',
    description: 'List all dashboard pages. Returns id, slug, title, description, published status, and creation date for each page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        published_only: {
          type: 'boolean',
          description: 'If true, only return published pages. Defaults to false (returns all pages).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_page',
    description: 'Get a specific dashboard page by its slug, including the full widget configuration.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slug: {
          type: 'string',
          description: 'The URL slug of the page (e.g. "dashboard", "leads-overview")',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'create_page',
    description: 'Create a new dashboard page with a custom widget layout. The page will be accessible at /pages/{slug}.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Human-readable page title',
        },
        slug: {
          type: 'string',
          description: 'URL-safe slug (lowercase, hyphens only). Auto-generated from title if omitted.',
        },
        description: {
          type: 'string',
          description: 'Optional description of what this page shows',
        },
        published: {
          type: 'boolean',
          description: 'Whether to publish the page immediately (shows in sidebar). Defaults to true.',
        },
        config: {
          type: 'object',
          description: 'Page layout config with widgets array',
          properties: {
            layout: {
              type: 'object',
              properties: {
                cols: { type: 'number', description: 'Number of grid columns (default 12)' },
                gap: { type: 'number', description: 'Grid gap size (default 4)' },
              },
            },
            widgets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['LiveLeadPreview', 'AmoCRMAnalytics', 'MoizvonkiAnalytics', 'TaritiGPTPrompt', 'MessageLog', 'LeadTimeline', 'CustomHTML'] },
                  colSpan: { type: 'number', minimum: 1, maximum: 12 },
                  rowSpan: { type: 'number' },
                  settings: { type: 'object' },
                },
                required: ['id', 'type', 'colSpan'],
              },
            },
          },
          required: ['widgets'],
        },
      },
      required: ['title', 'config'],
    },
  },
  {
    name: 'update_page',
    description: 'Update an existing dashboard page. You can change the title, description, published status, or the full widget configuration.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the page to update',
        },
        title: { type: 'string', description: 'New title (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        published: { type: 'boolean', description: 'New published status (optional)' },
        config: { type: 'object', description: 'New page config (optional, replaces existing config entirely)' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'delete_page',
    description: 'Permanently delete a dashboard page. This cannot be undone.',
    input_schema: {
      type: 'object' as const,
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the page to delete',
        },
      },
      required: ['slug'],
    },
  },
]

export async function handleListPages(
  input: { published_only?: boolean },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createServiceClient()

  let query = supabase
    .from('pages')
    .select('id, slug, title, description, published, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (input.published_only) {
    query = query.eq('published', true)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: `Failed to fetch pages: ${error.message}` }
  }

  return { success: true, data: { pages: data, count: data?.length ?? 0 } }
}

export async function handleGetPage(
  input: { slug: string },
  _ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', input.slug)
    .maybeSingle()

  if (error) {
    return { success: false, error: `Failed to fetch page: ${error.message}` }
  }
  if (!data) {
    return { success: false, error: `Page with slug "${input.slug}" not found` }
  }

  return { success: true, data: { page: data } }
}

export async function handleCreatePage(
  input: {
    title?: string
    slug?: string
    description?: string
    published?: boolean
    config?: object
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const title = (input.title ?? '').trim() || 'Untitled Page'
  const parsed = PageConfigSchema.safeParse(
    input.config != null && typeof input.config === 'object' ? input.config : undefined,
  )
  const config = parsed.success ? parsed.data : DEFAULT_PAGE_CONFIG
  if (!parsed.success && input.config != null) {
    // Log but continue with default so we never hang
    console.warn('create_page: invalid config, using default', parsed.error.flatten())
  }

  const supabase = createServiceClient()
  const slug =
    input.slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
    title.toLowerCase().replace(/[^a-z0-9-]/g, '-') ||
    `page-${Date.now()}`

  const { data, error } = await supabase
    .from('pages')
    .insert({
      slug,
      title,
      description: input.description ?? null,
      creator: ctx.userId,
      config: config as object,
      published: input.published ?? true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to create page: ${error.message}` }
  }

  return {
    success: true,
    data: {
      page: data,
      url: `/pages/${data.slug}`,
      message: `Page "${data.title}" created at /pages/${data.slug}`,
    },
  }
}

export async function handleUpdatePage(
  input: {
    slug: string
    title?: string
    description?: string
    published?: boolean
    config?: object
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createServiceClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.published !== undefined) updateData.published = input.published
  if (input.config !== undefined) updateData.config = input.config

  const { data, error } = await supabase
    .from('pages')
    .update(updateData)
    .eq('slug', input.slug)
    .eq('creator', ctx.userId)
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to update page: ${error.message}` }
  }

  return {
    success: true,
    data: { page: data, message: `Page "${data.title}" updated successfully` },
  }
}

export async function handleDeletePage(
  input: { slug: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('slug', input.slug)
    .eq('creator', ctx.userId)

  if (error) {
    return { success: false, error: `Failed to delete page: ${error.message}` }
  }

  return {
    success: true,
    data: { message: `Page "${input.slug}" has been permanently deleted` },
  }
}
