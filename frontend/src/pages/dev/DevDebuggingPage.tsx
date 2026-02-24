import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiBaseUrl, getToken } from '@/lib/api'

export default function DevDebuggingPage() {
  const developer = useDeveloper()
  const [user, setUser] = useState<object | null>(null)
  const [env, setEnv] = useState<Record<string, string>>({})
  const [backendPing, setBackendPing] = useState<string | null>(null)

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to view debugging info.</p>
      </div>
    )
  }

  async function loadUser() {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u ? { id: u.id, email: u.email, created_at: u.created_at } : null)
  }

  function loadEnv() {
    const e: Record<string, string> = {}
    const v = import.meta.env
    for (const key of Object.keys(v)) {
      if (key.startsWith('VITE_')) {
        const val = v[key]
        e[key] = typeof val === 'string' ? (val.length > 60 ? val.slice(0, 60) + '…' : val) : String(val)
      }
    }
    setEnv(e)
  }

  async function pingBackend() {
    try {
      const token = await getToken()
      const start = performance.now()
      const res = await fetch(`${apiBaseUrl()}/api/user/preferences`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      const ms = Math.round(performance.now() - start)
      setBackendPing(res.ok ? `OK (${ms} ms)` : `HTTP ${res.status} (${ms} ms)`)
    } catch (e) {
      setBackendPing(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-white">Debugging</h1>
        <p className="text-sm text-slate-400 mt-1">Quick checks and info for development.</p>

        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Current user</h2>
            <button
              onClick={loadUser}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Load user
            </button>
            {user && (
              <pre className="mt-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(user, null, 2)}
              </pre>
            )}
          </section>

          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Vite env (public)</h2>
            <button
              onClick={loadEnv}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Show env
            </button>
            {Object.keys(env).length > 0 && (
              <pre className="mt-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(env, null, 2)}
              </pre>
            )}
          </section>

          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Backend</h2>
            <button
              onClick={pingBackend}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Ping backend
            </button>
            {backendPing && (
              <p className="mt-3 text-sm text-slate-300">{backendPing}</p>
            )}
            <p className="text-xs text-slate-500 mt-2">URL: {apiBaseUrl()}</p>
          </section>

          <section className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Developer context</h2>
            <p className="text-xs text-slate-400">
              developerMode: on · Log entries: {developer.logEntries.length}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
