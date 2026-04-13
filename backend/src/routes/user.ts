import express from 'express'
import { createServiceClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { getSystemPrompt } from '../lib/ai/system-prompt.js'
import { testAnthropicApiKey, testOpenAIApiKey } from '../lib/ai/validate-keys.js'
import { allTools, isRiskyTool } from '../lib/ai/tools/index.js'

const router = express.Router()

/** Stored in DB (includes secret fields). */
export type UserPreferences = {
  ai_provider?: 'anthropic' | 'openai' | 'anthropic_with_openai_fallback'
  openai_fallback_enabled?: boolean
  openai_model?: string
  developer_mode?: boolean
  /** How the user wants to be addressed. */
  display_name?: string
  job_title?: string
  /** Long-term facts / context for the AI. */
  ai_memory?: string
  /** Tone, traits, formality, language preferences. */
  ai_personality?: string
  /** Extra behavioral rules. */
  ai_custom_instructions?: string
  /** ISO timestamp when guided /setup was completed (optional). */
  setup_completed_at?: string
  /** Per-user Anthropic key (never returned to the client). */
  anthropic_api_key?: string
  /** Per-user OpenAI key (never returned to the client). */
  openai_api_key?: string
}

/** Safe to send to the browser. */
export type UserPreferencesPublic = Omit<UserPreferences, 'anthropic_api_key' | 'openai_api_key'> & {
  anthropic_api_key_configured?: boolean
  openai_api_key_configured?: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  ai_provider: 'anthropic',
  openai_fallback_enabled: true,
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}

function redactForClient(merged: UserPreferences): UserPreferencesPublic {
  const { anthropic_api_key, openai_api_key, ...rest } = merged
  return {
    ...rest,
    anthropic_api_key_configured: Boolean(anthropic_api_key?.trim()),
    openai_api_key_configured: Boolean(openai_api_key?.trim()),
  }
}

/** Full merged preferences including API keys (for AI routes only). */
export async function getUserPreferencesForAi(userId: string): Promise<UserPreferences> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  const prefs = (data?.preferences as UserPreferences) ?? {}
  return { ...DEFAULT_PREFERENCES, ...prefs }
}

// GET /api/user/preferences
router.get('/preferences', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', req.user!.id)
      .maybeSingle()

    if (error) throw error
    const prefs = (data?.preferences as UserPreferences) ?? {}
    const merged = { ...DEFAULT_PREFERENCES, ...prefs }
    res.json({ preferences: redactForClient(merged) })
  } catch (err: unknown) {
    console.error('Get preferences error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load preferences' })
  }
})

// PATCH /api/user/preferences
router.patch('/preferences', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as Partial<UserPreferences> & {
      anthropic_api_key?: string | null
      openai_api_key?: string | null
    }
    const allowed: (keyof UserPreferences)[] = [
      'ai_provider',
      'openai_fallback_enabled',
      'openai_model',
      'developer_mode',
    ]
    const updates: UserPreferences = {}
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'ai_provider' && !['anthropic', 'openai', 'anthropic_with_openai_fallback'].includes(body[key] as string)) continue
        if (key === 'openai_fallback_enabled') updates[key] = Boolean(body[key])
        else if (key === 'openai_model') updates[key] = String(body[key] ?? '').trim() || undefined
        else if (key === 'developer_mode') updates[key] = Boolean(body[key])
        else updates[key as keyof UserPreferences] = body[key]
      }
    }

    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', req.user!.id)
      .maybeSingle()

    const current = (existing?.preferences as UserPreferences) ?? {}
    let merged: UserPreferences = { ...DEFAULT_PREFERENCES, ...current, ...updates }

    const profileStringKeys = [
      'display_name',
      'job_title',
      'ai_memory',
      'ai_personality',
      'ai_custom_instructions',
    ] as const
    for (const key of profileStringKeys) {
      if (body[key] !== undefined) {
        const v = String(body[key] ?? '').trim()
        if (v) merged[key] = v
        else delete merged[key]
      }
    }
    if (body.setup_completed_at !== undefined) {
      const v = String(body.setup_completed_at ?? '').trim()
      if (v) merged.setup_completed_at = v
      else delete merged.setup_completed_at
    }

    if (body.anthropic_api_key !== undefined) {
      const v = body.anthropic_api_key
      if (v === null || String(v).trim() === '') {
        delete merged.anthropic_api_key
      } else {
        merged.anthropic_api_key = String(v).trim()
      }
    }

    if (body.openai_api_key !== undefined) {
      const v = body.openai_api_key
      if (v === null || String(v).trim() === '') {
        delete merged.openai_api_key
      } else {
        merged.openai_api_key = String(v).trim()
      }
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: req.user!.id, preferences: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) throw error
    const saved = (data?.preferences as UserPreferences) ?? merged
    res.json({ preferences: redactForClient({ ...DEFAULT_PREFERENCES, ...saved }) })
  } catch (err: unknown) {
    console.error('Update preferences error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save preferences' })
  }
})

// POST /api/user/test-anthropic-key — body: { api_key?: string } (omit to test saved key)
router.post('/test-anthropic-key', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const raw = typeof req.body?.api_key === 'string' ? req.body.api_key.trim() : ''
    let key = raw
    if (!key) {
      const prefs = await getUserPreferencesForAi(req.user!.id)
      key = prefs.anthropic_api_key?.trim() ?? ''
    }
    if (!key) {
      return res.json({ ok: false, error: 'No API key to test. Paste a key or save one first.' })
    }
    const result = await testAnthropicApiKey(key)
    return res.json(result.ok ? { ok: true } : { ok: false, error: result.error ?? 'Validation failed' })
  } catch (err: unknown) {
    console.error('test-anthropic-key:', err)
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Test failed' })
  }
})

// POST /api/user/test-openai-key — body: { api_key?: string } (omit to test saved key)
router.post('/test-openai-key', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const raw = typeof req.body?.api_key === 'string' ? req.body.api_key.trim() : ''
    let key = raw
    if (!key) {
      const prefs = await getUserPreferencesForAi(req.user!.id)
      key = prefs.openai_api_key?.trim() ?? ''
    }
    if (!key) {
      return res.json({ ok: false, error: 'No API key to test. Paste a key or save one first.' })
    }
    const result = await testOpenAIApiKey(key)
    return res.json(result.ok ? { ok: true } : { ok: false, error: result.error ?? 'Validation failed' })
  } catch (err: unknown) {
    console.error('test-openai-key:', err)
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Test failed' })
  }
})

// GET /api/user/system-prompt (for developer / system prompt page)
router.get('/system-prompt', requireAuth, (_req, res) => {
  try {
    res.json({ systemPrompt: getSystemPrompt() })
  } catch (err: unknown) {
    console.error('System prompt error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load system prompt' })
  }
})

// GET /api/user/tools (for developer tools reference page)
router.get('/tools', requireAuth, (_req, res) => {
  try {
    const tools = allTools.map((t) => ({
      name: t.name,
      description: (t as { description?: string }).description ?? '',
      risky: isRiskyTool(t.name),
    }))
    res.json({ tools })
  } catch (err: unknown) {
    console.error('Tools list error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load tools' })
  }
})

export default router
