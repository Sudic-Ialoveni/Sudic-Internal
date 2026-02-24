import { useEffect, useState } from 'react'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch, apiPost } from '@/lib/api'

type ApiStatus = { amocrm: boolean; moizvonki: boolean }

type VariableItem = {
  id: string
  description: string
  source: string
  entity: string
  requiredParams: string[]
  optionalParams: string[]
  examplePath: string
}

export default function DevApiPage() {
  const developer = useDeveloper()
  const [status, setStatus] = useState<ApiStatus | null>(null)
  const [variables, setVariables] = useState<VariableItem[]>([])
  const [variablesLoading, setVariablesLoading] = useState(true)
  const [resolvePath, setResolvePath] = useState('amocrm.account')
  const [resolveParams, setResolveParams] = useState('{}')
  const [resolveResult, setResolveResult] = useState<unknown>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveLoading, setResolveLoading] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)

  const [amocrmMethod, setAmocrmMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET')
  const [amocrmPath, setAmocrmPath] = useState('/api/v4/account')
  const [amocrmBody, setAmocrmBody] = useState('{}')
  const [amocrmResult, setAmocrmResult] = useState<unknown>(null)
  const [amocrmLoading, setAmocrmLoading] = useState(false)
  const [amocrmError, setAmocrmError] = useState<string | null>(null)

  const [moizvonkiAction, setMoizvonkiAction] = useState('calls.list')
  const [moizvonkiParams, setMoizvonkiParams] = useState('{"from_id": 0, "max_results": 5}')
  const [moizvonkiResult, setMoizvonkiResult] = useState<unknown>(null)
  const [moizvonkiLoading, setMoizvonkiLoading] = useState(false)
  const [moizvonkiError, setMoizvonkiError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<ApiStatus>('/api/dev/status')
      .then(setStatus)
      .catch(() => setStatus({ amocrm: false, moizvonki: false }))
  }, [])

  useEffect(() => {
    apiFetch<{ variables: VariableItem[] }>('/api/external-api/variables')
      .then((r) => setVariables(r.variables ?? []))
      .catch(() => setVariables([]))
      .finally(() => setVariablesLoading(false))
  }, [])

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to test external APIs.</p>
      </div>
    )
  }

  async function runResolve() {
    setResolveError(null)
    setResolveResult(null)
    setResolveLoading(true)
    try {
      let params: Record<string, unknown> | undefined
      try {
        const parsed = JSON.parse(resolveParams || '{}')
        params = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : undefined
      } catch {
        setResolveError('Invalid JSON in params')
        return
      }
      const result = await apiPost<{ success: boolean; value?: unknown; error?: string }>('/api/external-api/resolve', {
        path: resolvePath.trim(),
        ...(params && Object.keys(params).length > 0 ? { params } : {}),
      })
      if (result.success) setResolveResult(result.value)
      else setResolveError(result.error ?? 'Resolve failed')
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setResolveLoading(false)
    }
  }

  async function runAmoCrm() {
    setAmocrmError(null)
    setAmocrmResult(null)
    setAmocrmLoading(true)
    try {
      let body: object | undefined
      try {
        body = JSON.parse(amocrmBody || '{}')
      } catch {
        setAmocrmError('Invalid JSON in body')
        return
      }
      const result = await apiPost<{ success: boolean; data?: unknown; error?: string }>('/api/dev/amocrm', {
        method: amocrmMethod,
        path: amocrmPath,
        ...(Object.keys(body as object).length ? { body } : {}),
      })
      if (result.success) setAmocrmResult(result.data)
      else setAmocrmError(result.error ?? 'Request failed')
    } catch (e) {
      setAmocrmError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setAmocrmLoading(false)
    }
  }

  async function runMoizvonki() {
    setMoizvonkiError(null)
    setMoizvonkiResult(null)
    setMoizvonkiLoading(true)
    try {
      let params: Record<string, unknown>
      try {
        params = JSON.parse(moizvonkiParams || '{}') as Record<string, unknown>
      } catch {
        setMoizvonkiError('Invalid JSON in params')
        return
      }
      const result = await apiPost<{ success: boolean; data?: unknown; error?: string }>('/api/dev/moizvonki', {
        action: moizvonkiAction,
        params,
      })
      if (result.success) setMoizvonkiResult(result.data)
      else setMoizvonkiError(result.error ?? 'Request failed')
    } catch (e) {
      setMoizvonkiError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setMoizvonkiLoading(false)
    }
  }

  const bySource = {
    amocrm: variables.filter((v) => v.source === 'amocrm'),
    moizvonki: variables.filter((v) => v.source === 'moizvonki'),
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-white">External API — Variables &amp; testing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Resolve values by path (used by Tariti) or run raw API calls. Full list of variables below.
        </p>

        {status && (
          <div className="mt-6 flex gap-4">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status.amocrm ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
              AmoCRM {status.amocrm ? 'configured' : 'not configured'}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${status.moizvonki ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
              Moizvonki {status.moizvonki ? 'configured' : 'not configured'}
            </span>
          </div>
        )}

        {/* Section 2: Test a variable */}
        <section className="mt-8 rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Test a variable (Resolve)</h2>
          <p className="text-xs text-slate-400 mb-3">Enter a path and optional params. Same as get_external_value tool.</p>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={resolvePath}
                onChange={(e) => setResolvePath(e.target.value)}
                placeholder="amocrm.lead(123).potential_amount"
                className="flex-1 min-w-[200px] rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={runResolve}
                disabled={resolveLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium"
              >
                {resolveLoading ? 'Resolving…' : 'Resolve'}
              </button>
            </div>
            <textarea
              value={resolveParams}
              onChange={(e) => setResolveParams(e.target.value)}
              placeholder='Optional params: {"from_date": 1234567890, "to_date": 1234567890}'
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
            />
          </div>
          {resolveError && <p className="mt-2 text-sm text-rose-400">{resolveError}</p>}
          {resolveResult !== null && (
            <pre className="mt-3 p-3 rounded-lg bg-slate-900/80 text-xs text-slate-300 overflow-auto max-h-64">
              {JSON.stringify(resolveResult, null, 2)}
            </pre>
          )}
        </section>

        {/* Section 1: List of all variables */}
        <section className="mt-8 rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">All possible variables</h2>
          {variablesLoading ? (
            <p className="text-slate-400 text-sm">Loading…</p>
          ) : (
            <div className="space-y-6">
              {['amocrm', 'moizvonki'].map((source) => (
                <div key={source}>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{source}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600 text-left">
                          <th className="py-2 pr-3 text-slate-400 font-medium">Path / ID</th>
                          <th className="py-2 pr-3 text-slate-400 font-medium">Description</th>
                          <th className="py-2 pr-3 text-slate-400 font-medium">Required</th>
                          <th className="py-2 text-slate-400 font-medium">Optional</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bySource[source as keyof typeof bySource].map((v) => (
                          <tr key={v.id} className="border-b border-slate-700/60">
                            <td className="py-2 pr-3 font-mono text-slate-200">{v.examplePath}</td>
                            <td className="py-2 pr-3 text-slate-300">{v.description}</td>
                            <td className="py-2 pr-3 text-slate-400">{v.requiredParams.join(', ') || '—'}</td>
                            <td className="py-2 text-slate-400">{v.optionalParams.join(', ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Raw API (collapsible) */}
        <section className="mt-8 rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
          <button
            type="button"
            onClick={() => setRawOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-200"
          >
            {rawOpen ? '▼' : '▶'} Raw API (AmoCRM method+path, Moizvonki action+params)
          </button>
          {rawOpen && (
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">AmoCRM</h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={amocrmMethod}
                      onChange={(e) => setAmocrmMethod(e.target.value as 'GET' | 'POST' | 'PATCH' | 'DELETE')}
                      className="rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input
                      type="text"
                      value={amocrmPath}
                      onChange={(e) => setAmocrmPath(e.target.value)}
                      placeholder="/api/v4/..."
                      className="flex-1 min-w-[200px] rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={runAmoCrm}
                      disabled={amocrmLoading || !status?.amocrm}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
                    >
                      {amocrmLoading ? 'Running…' : 'Run'}
                    </button>
                  </div>
                  {(amocrmMethod === 'POST' || amocrmMethod === 'PATCH') && (
                    <textarea
                      value={amocrmBody}
                      onChange={(e) => setAmocrmBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
                    />
                  )}
                </div>
                {amocrmError && <p className="mt-2 text-sm text-rose-400">{amocrmError}</p>}
                {amocrmResult !== null && (
                  <pre className="mt-3 p-3 rounded-lg bg-slate-900/80 text-xs text-slate-300 overflow-auto max-h-64">
                    {JSON.stringify(amocrmResult, null, 2)}
                  </pre>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Moizvonki (action + params in body)</h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={moizvonkiAction}
                      onChange={(e) => setMoizvonkiAction(e.target.value)}
                      placeholder="calls.list"
                      className="min-w-[180px] rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={runMoizvonki}
                      disabled={moizvonkiLoading || !status?.moizvonki}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
                    >
                      {moizvonkiLoading ? 'Running…' : 'Run'}
                    </button>
                  </div>
                  <textarea
                    value={moizvonkiParams}
                    onChange={(e) => setMoizvonkiParams(e.target.value)}
                    placeholder='{"from_id": 0, "max_results": 10}'
                    rows={4}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </div>
                {moizvonkiError && <p className="mt-2 text-sm text-rose-400">{moizvonkiError}</p>}
                {moizvonkiResult !== null && (
                  <pre className="mt-3 p-3 rounded-lg bg-slate-900/80 text-xs text-slate-300 overflow-auto max-h-64">
                    {JSON.stringify(moizvonkiResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
