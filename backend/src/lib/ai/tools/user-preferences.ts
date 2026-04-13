import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '../../supabase.js'
import type { ToolContext, ToolResult } from './index.js'

export const userPreferencesTools: Anthropic.Tool[] = [
  {
    name: 'update_user_preferences',
    description:
      'Save the current user\'s profile and AI preferences (name, role, long-term memory, personality, custom instructions). Use during /setup onboarding or when the user asks you to remember something. Merges with existing settings; omit a field to leave it unchanged.',
    input_schema: {
      type: 'object',
      properties: {
        display_name: {
          type: 'string',
          description: 'How the user wants to be addressed (e.g. first name or full name).',
        },
        job_title: {
          type: 'string',
          description: 'Job title or role at the company.',
        },
        ai_memory: {
          type: 'string',
          description: 'Replace long-term memory entirely with this text (facts, context, preferences).',
        },
        append_to_ai_memory: {
          type: 'string',
          description: 'Append this text to existing long-term memory (newline-separated).',
        },
        ai_personality: {
          type: 'string',
          description: 'How Tariti should behave: tone, traits, formality, language (e.g. Romanian).',
        },
        ai_custom_instructions: {
          type: 'string',
          description: 'Extra rules: what to prioritize, what to avoid, formatting preferences.',
        },
        mark_setup_complete: {
          type: 'boolean',
          description: 'Set true when guided /setup onboarding is finished.',
        },
      },
    },
  },
]

export async function handleUpdateUserPreferences(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const supabase = createServiceClient()
    const { data: row, error: fetchErr } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', ctx.userId)
      .maybeSingle()

    if (fetchErr) throw fetchErr

    const current = (row?.preferences as Record<string, unknown>) ?? {}
    const next: Record<string, unknown> = { ...current }

    if (typeof input.display_name === 'string') {
      const v = input.display_name.trim()
      if (v) next.display_name = v
      else delete next.display_name
    }
    if (typeof input.job_title === 'string') {
      const v = input.job_title.trim()
      if (v) next.job_title = v
      else delete next.job_title
    }
    if (typeof input.ai_memory === 'string') {
      const v = input.ai_memory.trim()
      if (v) next.ai_memory = v
      else delete next.ai_memory
    }
    if (typeof input.append_to_ai_memory === 'string' && input.append_to_ai_memory.trim()) {
      const add = input.append_to_ai_memory.trim()
      const prev = typeof next.ai_memory === 'string' ? next.ai_memory.trim() : ''
      next.ai_memory = prev ? `${prev}\n${add}` : add
    }
    if (typeof input.ai_personality === 'string') {
      const v = input.ai_personality.trim()
      if (v) next.ai_personality = v
      else delete next.ai_personality
    }
    if (typeof input.ai_custom_instructions === 'string') {
      const v = input.ai_custom_instructions.trim()
      if (v) next.ai_custom_instructions = v
      else delete next.ai_custom_instructions
    }
    if (input.mark_setup_complete === true) {
      next.setup_completed_at = new Date().toISOString()
    }

    const { error: upErr } = await supabase.from('user_preferences').upsert(
      {
        user_id: ctx.userId,
        preferences: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (upErr) throw upErr

    return {
      success: true,
      data: {
        message: 'Preferences saved.',
        updated_fields: Object.keys(input).filter((k) => input[k] !== undefined),
      },
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save preferences'
    return { success: false, error: msg }
  }
}
