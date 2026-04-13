import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { apiFetch, apiPatch, apiPost } from '@/lib/api'
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
  app_onboarding_completed?: boolean
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
  const [editingAnthropic, setEditingAnthropic] = useState(false)
  const [editingOpenai, setEditingOpenai] = useState(false)
  const [testingAnthropic, setTestingAnthropic] = useState(false)
  const [testingOpenai, setTestingOpenai] = useState(false)
  const [anthropicKeyFeedback, setAnthropicKeyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [openaiKeyFeedback, setOpenaiKeyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const developer = useDeveloper()
  const onboarding = useOnboarding()

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
      setEditingAnthropic(false)
      setEditingOpenai(false)
      setAnthropicKeyFeedback(null)
      setOpenaiKeyFeedback(null)
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

      const anthTrim = anthropicKeyInput.trim()
      const openTrim = openaiKeyInput.trim()
      if (anthTrim) body.anthropic_api_key = anthTrim
      if (openTrim) body.openai_api_key = openTrim

      const data = await apiPatch<{ preferences: UserPreferences }>('/api/user/preferences', body)
      setPrefs((p) => ({ ...p, ...data.preferences }))
      if (anthTrim) {
        setAnthropicKeyInput('')
        setEditingAnthropic(false)
      }
      if (openTrim) {
        setOpenaiKeyInput('')
        setEditingOpenai(false)
      }
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

  async function removeAnthropicKey() {
    setAnthropicKeyFeedback(null)
    try {
      const data = await apiPatch<{ preferences: UserPreferences }>('/api/user/preferences', { anthropic_api_key: '' })
      setPrefs((p) => ({ ...p, ...data.preferences }))
      setAnthropicKeyInput('')
      setEditingAnthropic(false)
      setAnthropicKeyFeedback({ type: 'success', text: 'Anthropic key removed.' })
    } catch {
      setAnthropicKeyFeedback({ type: 'error', text: 'Could not remove key.' })
    }
  }

  async function removeOpenaiKey() {
    setOpenaiKeyFeedback(null)
    try {
      const data = await apiPatch<{ preferences: UserPreferences }>('/api/user/preferences', { openai_api_key: '' })
      setPrefs((p) => ({ ...p, ...data.preferences }))
      setOpenaiKeyInput('')
      setEditingOpenai(false)
      setOpenaiKeyFeedback({ type: 'success', text: 'OpenAI key removed.' })
    } catch {
      setOpenaiKeyFeedback({ type: 'error', text: 'Could not remove key.' })
    }
  }

  async function testAnthropicKey() {
    setAnthropicKeyFeedback(null)
    setTestingAnthropic(true)
    try {
      const payload: { api_key?: string } = {}
      const t = anthropicKeyInput.trim()
      if (t) payload.api_key = t
      const r = await apiPost<{ ok: boolean; error?: string }>('/api/user/test-anthropic-key', payload)
      if (r.ok) setAnthropicKeyFeedback({ type: 'success', text: 'Anthropic key is valid.' })
      else setAnthropicKeyFeedback({ type: 'error', text: r.error ?? 'Key check failed.' })
    } catch {
      setAnthropicKeyFeedback({ type: 'error', text: 'Could not reach server.' })
    } finally {
      setTestingAnthropic(false)
    }
  }

  async function testOpenaiKey() {
    setOpenaiKeyFeedback(null)
    setTestingOpenai(true)
    try {
      const payload: { api_key?: string } = {}
      const t = openaiKeyInput.trim()
      if (t) payload.api_key = t
      const r = await apiPost<{ ok: boolean; error?: string }>('/api/user/test-openai-key', payload)
      if (r.ok) setOpenaiKeyFeedback({ type: 'success', text: 'OpenAI key is valid.' })
      else setOpenaiKeyFeedback({ type: 'error', text: r.error ?? 'Key check failed.' })
    } catch {
      setOpenaiKeyFeedback({ type: 'error', text: 'Could not reach server.' })
    } finally {
      setTestingOpenai(false)
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
              <div className="mt-8 space-y-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6" data-tour="settings-profile-panel">
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
              <div className="mt-8 space-y-5 rounded-xl border border-slate-700/60 bg-slate-800/40 p-6" data-tour="settings-ai-panel">
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
              <div className="mt-8 space-y-6" data-tour="settings-keys-panel">
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 space-y-6">
                  {/* Anthropic */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-medium text-slate-500">Anthropic (Claude)</label>
                      {prefs.anthropic_api_key_configured && !editingAnthropic && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">Saved</span>
                      )}
                    </div>
                    {prefs.anthropic_api_key_configured && !editingAnthropic ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div
                            className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2.5 font-mono text-sm text-slate-400 tracking-[0.35em] select-none"
                            aria-label="API key hidden"
                          >
                            ••••••••••••••••
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={testAnthropicKey}
                              disabled={testingAnthropic}
                              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                            >
                              {testingAnthropic ? 'Testing…' : 'Test'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnthropic(true)
                                setAnthropicKeyInput('')
                                setAnthropicKeyFeedback(null)
                              }}
                              className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-sm text-indigo-200 hover:bg-indigo-500/20"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={removeAnthropicKey}
                              className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 hover:bg-rose-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          Test sends one token using the same Claude model as Tariti (server{' '}
                          <code className="text-slate-400">CLAUDE_MODEL</code>).
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          type="password"
                          autoComplete="off"
                          value={anthropicKeyInput}
                          onChange={(e) => setAnthropicKeyInput(e.target.value)}
                          placeholder="sk-ant-api03-…"
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={testAnthropicKey}
                            disabled={
                              testingAnthropic ||
                              (!anthropicKeyInput.trim() && !prefs.anthropic_api_key_configured)
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                          >
                            {testingAnthropic ? 'Testing…' : 'Test key'}
                          </button>
                          {prefs.anthropic_api_key_configured && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnthropic(false)
                                setAnthropicKeyInput('')
                                setAnthropicKeyFeedback(null)
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {anthropicKeyFeedback && (
                      <p
                        className={`text-xs mt-2 ${
                          anthropicKeyFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {anthropicKeyFeedback.text}
                      </p>
                    )}
                  </div>

                  {/* OpenAI */}
                  <div className="pt-4 border-t border-slate-700/60">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-xs font-medium text-slate-500">OpenAI</label>
                      {prefs.openai_api_key_configured && !editingOpenai && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">Saved</span>
                      )}
                    </div>
                    {prefs.openai_api_key_configured && !editingOpenai ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div
                            className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2.5 font-mono text-sm text-slate-400 tracking-[0.35em] select-none"
                            aria-label="API key hidden"
                          >
                            ••••••••••••••••
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={testOpenaiKey}
                              disabled={testingOpenai}
                              className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                            >
                              {testingOpenai ? 'Testing…' : 'Test'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOpenai(true)
                                setOpenaiKeyInput('')
                                setOpenaiKeyFeedback(null)
                              }}
                              className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-sm text-indigo-200 hover:bg-indigo-500/20"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={removeOpenaiKey}
                              className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 hover:bg-rose-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">Test calls the OpenAI models list endpoint.</p>
                      </>
                    ) : (
                      <>
                        <input
                          type="password"
                          autoComplete="off"
                          value={openaiKeyInput}
                          onChange={(e) => setOpenaiKeyInput(e.target.value)}
                          placeholder="sk-…"
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={testOpenaiKey}
                            disabled={
                              testingOpenai || (!openaiKeyInput.trim() && !prefs.openai_api_key_configured)
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                          >
                            {testingOpenai ? 'Testing…' : 'Test key'}
                          </button>
                          {prefs.openai_api_key_configured && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOpenai(false)
                                setOpenaiKeyInput('')
                                setOpenaiKeyFeedback(null)
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {openaiKeyFeedback && (
                      <p
                        className={`text-xs mt-2 ${
                          openaiKeyFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {openaiKeyFeedback.text}
                      </p>
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
                <div className="mt-8 pt-6 border-t border-slate-700/60" data-tour="settings-reset-onboarding">
                  <h2 className="text-sm font-semibold text-slate-200 mb-1">Setup tour</h2>
                  <p className="text-xs text-slate-500 mb-3">
                    Run the interactive onboarding again (spotlight tour). You will be taken home and the tour restarts;
                    refresh also works while the tour is incomplete.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void onboarding.resetTour()
                    }}
                    className="px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200 hover:bg-amber-500/20 transition-colors"
                  >
                    Reset setup tour
                  </button>
                </div>
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
