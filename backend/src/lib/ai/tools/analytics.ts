import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '../../supabase.js'
import type { ToolContext, ToolResult } from './index.js'

export const analyticsTools: Anthropic.Tool[] = [
  {
    name: 'get_amocrm_analytics',
    description: 'Get AmoCRM contact/property analytics including total contacts synced and recent activity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: {
          type: 'string',
          description: 'Start date for analytics period (ISO 8601)',
        },
        date_to: {
          type: 'string',
          description: 'End date for analytics period (ISO 8601)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_moizvonki_analytics',
    description: 'Get call analytics from Moizvonki including total calls, duration statistics, and breakdown by call status (inbound/outbound/missed).',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: {
          type: 'string',
          description: 'Start date for analytics period (ISO 8601)',
        },
        date_to: {
          type: 'string',
          description: 'End date for analytics period (ISO 8601)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_leads_analytics',
    description: 'Get lead analytics including total counts, breakdown by status (new/accepted/rejected/etc.) and by source.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: {
          type: 'string',
          description: 'Start date for analytics period (ISO 8601)',
        },
        date_to: {
          type: 'string',
          description: 'End date for analytics period (ISO 8601)',
        },
      },
      required: [],
    },
  },
]

export async function handleGetAmocrmAnalytics(
  input: { date_from?: string; date_to?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  let query = supabase.from('amocrm_contacts').select('*', { count: 'exact' })

  if (input.date_from) query = query.gte('synced_at', input.date_from)
  if (input.date_to) query = query.lte('synced_at', input.date_to)

  const { data, error, count } = await query

  if (error) {
    return { success: false, error: `Failed to fetch AmoCRM analytics: ${error.message}` }
  }

  // Summarise contact data fields
  const summary = {
    total_contacts: count ?? 0,
    date_range: { from: input.date_from, to: input.date_to },
    sample: data?.slice(0, 5).map(c => ({ id: c.id, synced_at: c.synced_at })) ?? [],
  }

  return { success: true, data: summary }
}

export async function handleGetMoizvonkiAnalytics(
  input: { date_from?: string; date_to?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  let query = supabase.from('calls').select('*', { count: 'exact' })

  if (input.date_from) query = query.gte('created_at', input.date_from)
  if (input.date_to) query = query.lte('created_at', input.date_to)

  const { data, error, count } = await query

  if (error) {
    return { success: false, error: `Failed to fetch Moizvonki analytics: ${error.message}` }
  }

  const totalDuration = data?.reduce((sum, call) => sum + (call.duration ?? 0), 0) ?? 0
  const avgDuration = count && count > 0 ? Math.round(totalDuration / count) : 0

  const statusCounts = data?.reduce(
    (acc, call) => {
      const status = call.status ?? 'unknown'
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  ) ?? {}

  // Group by day for trend
  const byDay: Record<string, number> = {}
  data?.forEach(call => {
    const day = call.created_at.substring(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  })

  return {
    success: true,
    data: {
      total_calls: count ?? 0,
      total_duration_seconds: totalDuration,
      avg_duration_seconds: avgDuration,
      by_status: statusCounts,
      by_day: byDay,
      date_range: { from: input.date_from, to: input.date_to },
    },
  }
}

export async function handleGetLeadsAnalytics(
  input: { date_from?: string; date_to?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  let query = supabase.from('leads').select('*', { count: 'exact' })

  if (input.date_from) query = query.gte('created_at', input.date_from)
  if (input.date_to) query = query.lte('created_at', input.date_to)

  const { data, error, count } = await query

  if (error) {
    return { success: false, error: `Failed to fetch leads analytics: ${error.message}` }
  }

  const statusCounts = data?.reduce(
    (acc, lead) => {
      acc[lead.status] = (acc[lead.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  ) ?? {}

  const sourceCounts = data?.reduce(
    (acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  ) ?? {}

  // Group by day
  const byDay: Record<string, number> = {}
  data?.forEach(lead => {
    const day = lead.created_at.substring(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  })

  return {
    success: true,
    data: {
      total_leads: count ?? 0,
      by_status: statusCounts,
      by_source: sourceCounts,
      by_day: byDay,
      date_range: { from: input.date_from, to: input.date_to },
    },
  }
}
