import { useEffect, useState } from 'react'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch, apiPatch } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export type UserPreferences = {
  ai_provider?: 'anthropic' | 'openai' | 'anthropic_with_openai_fallback'
  openai_fallback_enabled?: boolean
  openai_model?: string
  developer_mode?: boolean
}

const DEFAULT_PREFS: UserPreferences = {
  ai_provider: 'anthropic',
  openai_fallback_enabled: true,
  openai_model: 'gpt-4o-mini',
  developer_mode: false,
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const developer = useDeveloper()

  useEffect(() => {
    fetchPrefs()
  }, [])

  async function fetchPrefs() {
    try {
      setLoading(true)
      const data = await apiFetch<{ preferences: UserPreferences }>('/api/user/preferences')
      const merged = { ...DEFAULT_PREFS, ...data.preferences }
      setPrefs(merged)
      developer?.setDeveloperMode(!!merged.developer_mode)
    } catch {
      setPrefs(DEFAULT_PREFS)
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    try {
      setSaving(true)
      setMessage(null)
      const data = await apiPatch<{ preferences: UserPreferences }>('/api/user/preferences', prefs)
      setPrefs((p) => ({ ...p, ...data.preferences }))
      developer?.setDeveloperMode(!!data.preferences?.developer_mode)
      setMessage({ type: 'success', text: 'Preferences saved.' })
    } catch {
      setMessage({ type: 'error', text: 'Could not save preferences.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-sm text-slate-400">Loading settings…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-white">Settings & preferences</h1>
        <p className="text-sm text-slate-400 mt-1">Configure AI provider and fallback for Tariti.</p>

        <div className="mt-8 space-y-8">
          {/* AI Provider */}
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">AI provider</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Primary provider</label>
                <select
                  value={prefs.ai_provider ?? 'anthropic'}
                  onChange={(e) => setPrefs((p) => ({ ...p, ai_provider: e.target.value as UserPreferences['ai_provider'] }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="anthropic">Claude (Anthropic)</option>
                  <option value="openai">OpenAI (e.g. GPT-4o)</option>
                  <option value="anthropic_with_openai_fallback">Claude with OpenAI fallback</option>
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {prefs.ai_provider === 'openai'
                    ? 'Use OpenAI for all Tariti requests. Set OPENAI_API_KEY in the backend.'
                    : prefs.ai_provider === 'anthropic_with_openai_fallback'
                      ? 'Use Claude first; if it’s overloaded or rate-limited, automatically try OpenAI.'
                      : 'Use Claude only. No fallback.'}
                </p>
              </div>

              {(prefs.ai_provider === 'anthropic' || prefs.ai_provider === 'anthropic_with_openai_fallback') && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs.openai_fallback_enabled ?? true}
                    onChange={(e) => setPrefs((p) => ({ ...p, openai_fallback_enabled: e.target.checked }))}
                    className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300">Use OpenAI when Claude is busy or rate-limited</span>
                </label>
              )}

              {(prefs.ai_provider === 'openai' || prefs.openai_fallback_enabled) && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">OpenAI model (optional)</label>
                  <input
                    type="text"
                    value={prefs.openai_model ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, openai_model: e.target.value.trim() || undefined }))}
                    placeholder="e.g. gpt-4o-mini, gpt-4o"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Backend default: OPENAI_MODEL or gpt-4o-mini</p>
                </div>
              )}
            </div>
          </section>

          {/* Developer mode */}
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Developer</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.developer_mode ?? false}
                onChange={(e) => setPrefs((p) => ({ ...p, developer_mode: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-300">Developer mode</span>
            </label>
            <p className="text-xs text-slate-500 mt-2">
              When enabled: all dev logs are printed to the browser console, and a Development section appears in the sidebar with Monitoring log, System prompt, and Debugging pages.
            </p>
          </section>
        </div>

        {message && (
          <div
            className={`mt-6 px-4 py-3 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
