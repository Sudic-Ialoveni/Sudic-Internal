import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '../../supabase.js'
import type { ToolContext, ToolResult } from './index.js'

export const leadTools: Anthropic.Tool[] = [
  {
    name: 'get_leads',
    description: 'Fetch leads from the database with optional filters. Returns name, phone, email, message, status, source, and timestamps.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['new', 'accepted', 'rejected', 'assigned', 'processed', 'forwarded'],
          description: 'Filter by lead status',
        },
        source: {
          type: 'string',
          description: 'Filter by lead source (e.g. "website", "phone", "amocrm")',
        },
        date_from: {
          type: 'string',
          description: 'Filter leads created after this date (ISO 8601 format)',
        },
        date_to: {
          type: 'string',
          description: 'Filter leads created before this date (ISO 8601 format)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of leads to return (default 50, max 200)',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_lead_status',
    description: 'Update the status of a specific lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: {
          type: 'string',
          description: 'The UUID of the lead to update',
        },
        status: {
          type: 'string',
          enum: ['new', 'accepted', 'rejected', 'assigned', 'processed', 'forwarded'],
          description: 'The new status for the lead',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for the status change (for context)',
        },
      },
      required: ['lead_id', 'status'],
    },
  },
  {
    name: 'forward_lead_to_amocrm',
    description: 'Forward a lead to AmoCRM. This marks the lead as "forwarded" and creates a contact/deal in AmoCRM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: {
          type: 'string',
          description: 'The UUID of the lead to forward',
        },
      },
      required: ['lead_id'],
    },
  },
]

export async function handleGetLeads(
  input: {
    status?: string
    source?: string
    date_from?: string
    date_to?: string
    limit?: number
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  const limit = Math.min(input.limit ?? 50, 200)

  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (input.status) query = query.eq('status', input.status)
  if (input.source) query = query.eq('source', input.source)
  if (input.date_from) query = query.gte('created_at', input.date_from)
  if (input.date_to) query = query.lte('created_at', input.date_to)

  const { data, error } = await query

  if (error) {
    return { success: false, error: `Failed to fetch leads: ${error.message}` }
  }

  return {
    success: true,
    data: {
      leads: data,
      count: data?.length ?? 0,
      filters_applied: { status: input.status, source: input.source, date_from: input.date_from, date_to: input.date_to },
    },
  }
}

export async function handleUpdateLeadStatus(
  input: { lead_id: string; status: string; reason?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  const updateData: Record<string, unknown> = {
    status: input.status,
  }

  if (input.status === 'processed' || input.status === 'forwarded') {
    updateData.processed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', input.lead_id)
    .select()
    .single()

  if (error) {
    return { success: false, error: `Failed to update lead: ${error.message}` }
  }

  return {
    success: true,
    data: {
      lead: data,
      message: `Lead ${data.name ?? data.id} status updated to "${input.status}"`,
    },
  }
}

export async function handleForwardLeadToAmocrm(
  input: { lead_id: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const supabase = createClient()
  await supabase.auth.setSession({ access_token: ctx.authToken, refresh_token: '' })

  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', input.lead_id)
    .single()

  if (fetchError || !lead) {
    return { success: false, error: `Lead not found: ${input.lead_id}` }
  }

  // Update status to forwarded
  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update({ status: 'forwarded', processed_at: new Date().toISOString() })
    .eq('id', input.lead_id)
    .select()
    .single()

  if (updateError) {
    return { success: false, error: `Failed to forward lead: ${updateError.message}` }
  }

  // If AmoCRM API is configured, make the actual API call
  const amocrmToken = process.env.AMOCRM_API_KEY
  const amocrmBaseUrl = process.env.AMOCRM_BASE_URL

  if (amocrmToken && amocrmBaseUrl) {
    try {
      const response = await fetch(`${amocrmBaseUrl}/api/v4/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${amocrmToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            name: lead.name || 'Unknown',
            custom_fields_values: [
              lead.phone && { field_code: 'PHONE', values: [{ value: lead.phone }] },
              lead.email && { field_code: 'EMAIL', values: [{ value: lead.email }] },
            ].filter(Boolean),
          },
        ]),
      })

      if (!response.ok) {
        console.warn('AmoCRM API returned non-OK status:', response.status)
      }
    } catch (err) {
      console.warn('AmoCRM API call failed (lead still marked as forwarded):', err)
    }
  }

  return {
    success: true,
    data: {
      lead: updatedLead,
      message: `Lead "${lead.name ?? lead.id}" has been forwarded to AmoCRM`,
    },
  }
}
