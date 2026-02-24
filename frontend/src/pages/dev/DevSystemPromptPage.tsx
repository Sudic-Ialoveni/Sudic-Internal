import { useEffect, useState } from 'react'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch } from '@/lib/api'

export default function DevSystemPromptPage() {
  const developer = useDeveloper()
  const [prompt, setPrompt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiFetch<{ systemPrompt?: string }>('/api/user/system-prompt')
        if (!cancelled) setPrompt(data.systemPrompt ?? '')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to view the system prompt.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">System prompt</h1>
        <p className="text-sm text-slate-400 mt-1">Tariti AI system prompt used by the backend.</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading && <p className="text-slate-500">Loading…</p>}
        {error && <p className="text-rose-400">{error}</p>}
        {prompt !== null && !loading && !error && (
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap rounded-xl bg-slate-800/80 border border-slate-700/60 p-4">
            {prompt}
          </pre>
        )}
      </div>
    </div>
  )
}
