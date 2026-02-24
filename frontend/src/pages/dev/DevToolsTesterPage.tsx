import { useEffect, useState } from 'react'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch, apiPost } from '@/lib/api'

type ToolDef = {
  name: string
  description: string
  risky: boolean
  input_schema: {
    type?: string
    properties?: Record<string, { type?: string; description?: string; enum?: string[] }>
    required?: string[]
  }
}

export default function DevToolsTesterPage() {
  const developer = useDeveloper()
  const [tools, setTools] = useState<ToolDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [inputJson, setInputJson] = useState('{}')
  const [result, setResult] = useState<unknown>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    apiFetch<{ tools: ToolDef[] }>('/api/dev/tools')
      .then((data) => {
        const list = data.tools ?? []
        setTools(list)
        if (list.length && !selected) setSelected(list[0].name)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load tools'))
      .finally(() => setLoading(false))
  }, [])

  const currentTool = tools.find((t) => t.name === selected)

  useEffect(() => {
    if (!currentTool?.input_schema?.properties) {
      setInputJson('{}')
      return
    }
    const defaults: Record<string, unknown> = {}
    const schema = currentTool.input_schema
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      if (prop.enum) defaults[key] = prop.enum[0]
      else if (prop.type === 'string') defaults[key] = ''
      else if (prop.type === 'number') defaults[key] = 0
      else if (prop.type === 'boolean') defaults[key] = false
      else if (prop.type === 'object') defaults[key] = {}
      else defaults[key] = ''
    }
    setInputJson(JSON.stringify(defaults, null, 2))
  }, [currentTool?.name])

  async function runTool() {
    if (!selected) return
    setRunError(null)
    setResult(null)
    setRunning(true)
    try {
      let toolInput: Record<string, unknown>
      try {
        toolInput = JSON.parse(inputJson || '{}')
      } catch {
        setRunError('Invalid JSON input')
        return
      }
      const res = await apiPost<{ success: boolean; data?: unknown; error?: string }>('/api/dev/tools/execute', {
        toolName: selected,
        toolInput,
      })
      if (res.success) setResult(res.data)
      else setRunError(res.error ?? 'Tool returned failure')
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Execution failed')
    } finally {
      setRunning(false)
    }
  }

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to test tools manually.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-white">Tools tester</h1>
        <p className="text-sm text-slate-400 mt-1">Run any Tariti AI tool with custom JSON input. Same tools used by the AI agent.</p>

        {loading && <p className="mt-6 text-slate-500">Loading tools…</p>}
        {error && <p className="mt-6 text-rose-400">{error}</p>}

        {!loading && !error && tools.length > 0 && (
          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            <div className="md:w-72 flex-shrink-0">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Tool</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
              >
                {tools.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                    {t.risky ? ' ⚠' : ''}
                  </option>
                ))}
              </select>
              {currentTool && (
                <p className="mt-2 text-xs text-slate-500">{currentTool.description}</p>
              )}
              {currentTool?.risky && (
                <p className="mt-1 text-xs text-amber-400">Requires approval when used by AI</p>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Input (JSON)</label>
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-slate-200 px-3 py-2 text-sm font-mono"
                spellCheck={false}
              />
              {currentTool?.input_schema?.properties && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">Schema</summary>
                  <pre className="mt-1 p-2 rounded bg-slate-800/80 text-xs text-slate-400 overflow-auto">
                    {JSON.stringify(currentTool.input_schema, null, 2)}
                  </pre>
                </details>
              )}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={runTool}
                  disabled={running}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {running ? 'Running…' : 'Run tool'}
                </button>
              </div>
            </div>
          </div>
        )}

        {(runError || result !== null) && (
          <section className="mt-8 rounded-xl border border-slate-700/60 bg-slate-800/40 p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Result</h2>
            {runError && <p className="text-sm text-rose-400">{runError}</p>}
            {result !== null && (
              <pre className="mt-2 p-3 rounded-lg bg-slate-900/80 text-xs text-slate-300 overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
