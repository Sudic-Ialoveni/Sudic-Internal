import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch, apiPatch } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabase/client'

export type UserPreferences = {
  ai_provider?: 'anthropic' | 'openai' | 'anthropic_with_openai_fallback'
  openai_fallback_enabled?: boolean
  openai_model?: string
  developer_mode?: boolean
  anthropic_api_key_configured?: boolean
  openai_api_key_configured?: boolean
  display_name?: string
  job_title?: string
  ai_memory?: string
  ai_personality?: string
  ai_custom_instructions?: string
  setup_completed_at?: string
}

const DEFAULT_PREFS: UserPreferences = {
  ai_provider: 'anthropic',
  openai_fallback_enabled: true,
  openai_model: 'gpt-4o-mini',
  developer_mode: false,
  anthropic_api_key_configured: false,
  openai_api_key_configured: false,
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'ai', label: 'AI memory & behavior' },
  { id: 'keys', label: 'API keys & model' },
  { id: 'developer', label: 'Developer' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabId | null
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'profile'

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS)
  const [anthropicKeyInput, setAnthropicKeyInput] = useState('')
  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [clearAnthropicKey, setClearAnthropicKey] = useState(false)
  const [clearOpenaiKey, setClearOpenaiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      setAnthropicKeyInput('')
      setOpenaiKeyInput('')
      setClearAnthropicKey(false)
      setClearOpenaiKey(false)
      developer?.setDeveloperMode(!!merged.developer_mode)
    } catch {
      setPrefs(DEFAULT_PREFS)
    } finally {
      setLoading(false)
    }
  }

  function setTab(tab: TabId) {
    setSearchParams({ tab })
  }

  async function savePreferences() {
    try {
      setSaving(true)
      setMessage(null)

      const body: Record<string, unknown> = {
        ai_provider: prefs.ai_provider,
        openai_fallback_enabled: prefs.openai_fallback_enabled,
        openai_model: prefs.openai_model,
        developer_mode: prefs.developer_mode,
        display_name: prefs.display_name,
        job_title: prefs.job_title,
        ai_memory: prefs.ai_memory,
        ai_personality: prefs.ai_personality,
        ai_custom_instructions: prefs.ai_custom_instructions,
      }

      if (clearAnthropicKey) {
        body.anthropic_api_key = ''
      } else if (anthropicKeyInput.trim()) {
        body.anthropic_api_key = anthropicKeyInput.trim()
      }

      if (clearOpenaiKey) {
        body.openai_api_key = ''
      } else if (openaiKeyInput.trim()) {
        body.openai_api_key = openaiKeyInput.trim()
      }

      const data = await apiPatch<{ preferences: UserPreferences }>('/api/user/preferences', body)
      setPrefs((p) => ({ ...p, ...data.preferences }))
      setAnthropicKeyInput('')
      setOpenaiKeyInput('')
      setClearAnthropicKey(false)
      setClearOpenaiKey(false)
      developer?.setDeveloperMode(!!data.preferences?.developer_mode)
      setMessage({ type: 'success', text: 'Settings saved.' })
    } catch {
      setMessage({ type: 'error', text: 'Could not save settings.' })
    } finally {
      setSaving(false)
    }
  }

  async function savePassword() {
    setPasswordMessage(null)
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    try {
      setPasswordSaving(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({ type: 'success', text: 'Password updated.' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update password.'
      setPasswordMessage({ type: 'error', text: msg })
    } finally {
      setPasswordSaving(false)
    }
  }

  const showSaveBar = useMemo(() => activeTab !== 'security', [activeTab])

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
    <div className="flex-1 flex min-h-0 bg-slate-900">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-slate-700/60 py-6 px-3">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Settings</p>
        <nav className="space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === t.id
                  ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {activeTab === 'profile' && (
            <>
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="text-sm text-slate-400 mt-1">How you appear to Tariti and in the app.</p>
              <div className="mt-8 space-y-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Display name</label>
                  <input
                    type="text"
                    value={prefs.display_name ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="e.g. Teodor"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Job title / role</label>
                  <input
                    type="text"
                    value={prefs.job_title ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, job_title: e.target.value }))}
                    placeholder="e.g. Operations lead"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {prefs.setup_completed_at && (
                  <p className="text-xs text-slate-500">
                    Guided setup completed: {new Date(prefs.setup_completed_at).toLocaleString()}
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h1 className="text-2xl font-semibold text-white">Security</h1>
              <p className="text-sm text-slate-400 mt-1">Change your account password (Supabase auth).</p>
              <div className="mt-8 space-y-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">New password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Confirm password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {passwordMessage && (
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      passwordMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}
                <button
                  type="button"
                  onClick={savePassword}
                  disabled={passwordSaving || !newPassword}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {passwordSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <h1 className="text-2xl font-semibold text-white">AI memory & behavior</h1>
              <p className="text-sm text-slate-400 mt-1">
                Tariti reads this on every reply. You can also run <code className="text-indigo-300">/setup</code> in chat
                for a guided walkthrough.
              </p>
              <div className="mt-8 space-y-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Long-term memory</label>
                  <textarea
                    value={prefs.ai_memory ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, ai_memory: e.target.value }))}
                    placeholder="Facts, projects, preferences Tariti should remember…"
                    rows={5}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Personality & tone</label>
                  <textarea
                    value={prefs.ai_personality ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, ai_personality: e.target.value }))}
                    placeholder="e.g. Concise, friendly, prefers Romanian for casual chat…"
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Additional instructions</label>
                  <textarea
                    value={prefs.ai_custom_instructions ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, ai_custom_instructions: e.target.value }))}
                    placeholder="Extra rules: what to prioritize, what to avoid…"
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'keys' && (
            <>
              <h1 className="text-2xl font-semibold text-white">API keys & model</h1>
              <p className="text-sm text-slate-400 mt-1">
                Optional personal keys override server defaults. Keys are stored server-side only.
              </p>
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-medium text-slate-500">Anthropic (Claude)</label>
                      {prefs.anthropic_api_key_configured && !clearAnthropicKey && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">Saved</span>
                      )}
                    </div>
                    <input
                      type="password"
                      autoComplete="off"
                      value={clearAnthropicKey ? '' : anthropicKeyInput}
                      onChange={(e) => {
                        setClearAnthropicKey(false)
                        setAnthropicKeyInput(e.target.value)
                      }}
                      disabled={clearAnthropicKey}
                      placeholder={prefs.anthropic_api_key_configured ? 'New key to replace' : 'sk-ant-api03-…'}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    {prefs.anthropic_api_key_configured && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearAnthropicKey((c) => !c)
                          setAnthropicKeyInput('')
                        }}
                        className="mt-2 text-xs text-rose-400 hover:text-rose-300"
                      >
                        {clearAnthropicKey ? 'Undo remove' : 'Remove saved Anthropic key'}
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-medium text-slate-500">OpenAI</label>
                      {prefs.openai_api_key_configured && !clearOpenaiKey && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">Saved</span>
                      )}
                    </div>
                    <input
                      type="password"
                      autoComplete="off"
                      value={clearOpenaiKey ? '' : openaiKeyInput}
                      onChange={(e) => {
                        setClearOpenaiKey(false)
                        setOpenaiKeyInput(e.target.value)
                      }}
                      disabled={clearOpenaiKey}
                      placeholder={prefs.openai_api_key_configured ? 'New key to replace' : 'sk-…'}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    {prefs.openai_api_key_configured && (
                      <button
                        type="button"
                        onClick={() => {
                          setClearOpenaiKey((c) => !c)
                          setOpenaiKeyInput('')
                        }}
                        className="mt-2 text-xs text-rose-400 hover:text-rose-300"
                      >
                        {clearOpenaiKey ? 'Undo remove' : 'Remove saved OpenAI key'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-4">
                  <h2 className="text-sm font-semibold text-slate-200">AI provider</h2>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Primary provider</label>
                    <select
                      value={prefs.ai_provider ?? 'anthropic'}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, ai_provider: e.target.value as UserPreferences['ai_provider'] }))
                      }
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="anthropic">Claude (Anthropic)</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic_with_openai_fallback">Claude with OpenAI fallback</option>
                    </select>
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
                      <label className="block text-xs font-medium text-slate-500 mb-2">OpenAI model</label>
                      <input
                        type="text"
                        value={prefs.openai_model ?? ''}
                        onChange={(e) => setPrefs((p) => ({ ...p, openai_model: e.target.value.trim() || undefined }))}
                        placeholder="gpt-4o-mini"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'developer' && (
            <>
              <h1 className="text-2xl font-semibold text-white">Developer</h1>
              <p className="text-sm text-slate-400 mt-1">Extra tools and logging for debugging.</p>
              <div className="mt-8 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
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
                  Enables dev logs in the browser console and the Development section in the sidebar.
                </p>
              </div>
            </>
          )}

          {message && (
            <div
              className={`mt-6 px-4 py-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}
            >
              {message.text}
            </div>
          )}

          {showSaveBar && (
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={savePreferences}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
