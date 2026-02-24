import express from 'express'
import { createServiceClient } from '../lib/supabase.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { getSystemPrompt } from '../lib/ai/system-prompt.js'
import { allTools, isRiskyTool } from '../lib/ai/tools/index.js'

const router = express.Router()

export type UserPreferences = {
  ai_provider?: 'anthropic' | 'openai' | 'anthropic_with_openai_fallback'
  openai_fallback_enabled?: boolean
  openai_model?: string
  developer_mode?: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  ai_provider: 'anthropic',
  openai_fallback_enabled: true,
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
    res.json({ preferences: { ...DEFAULT_PREFERENCES, ...prefs } })
  } catch (err: unknown) {
    console.error('Get preferences error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load preferences' })
  }
})

// PATCH /api/user/preferences
router.patch('/preferences', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as Partial<UserPreferences>
    const allowed: (keyof UserPreferences)[] = ['ai_provider', 'openai_fallback_enabled', 'openai_model', 'developer_mode']
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
    const merged = { ...DEFAULT_PREFERENCES, ...current, ...updates }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: req.user!.id, preferences: merged, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) throw error
    res.json({ preferences: (data?.preferences as UserPreferences) ?? merged })
  } catch (err: unknown) {
    console.error('Update preferences error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save preferences' })
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
