import { useEffect, useState } from 'react'
import { useDeveloper } from '@/contexts/DeveloperContext'
import { apiFetch } from '@/lib/api'

type ToolRow = { name: string; description: string; risky: boolean }

export default function DevToolsPage() {
  const developer = useDeveloper()
  const [tools, setTools] = useState<ToolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<{ tools: ToolRow[] }>('/api/user/tools')
      .then((data) => {
        if (!cancelled) setTools(data.tools ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (!developer?.developerMode) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <p className="text-slate-400">Enable Developer mode in Settings to view the tools reference.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-white">Tools reference</h1>
        <p className="text-sm text-slate-400 mt-1">Tariti AI tools: name, description, and whether they require approval.</p>

        {loading && <p className="mt-6 text-slate-500">Loading…</p>}
        {error && <p className="mt-6 text-rose-400">{error}</p>}
        {!loading && !error && tools.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Description</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium w-24">Approval</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.name} className="border-b border-slate-800/80">
                    <td className="py-3 px-2 font-mono text-amber-200/90">{t.name}</td>
                    <td className="py-3 px-2 text-slate-300">{t.description}</td>
                    <td className="py-3 px-2">
                      {t.risky ? (
                        <span className="text-amber-400 text-xs font-medium">Required</span>
                      ) : (
                        <span className="text-slate-500 text-xs">Auto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
