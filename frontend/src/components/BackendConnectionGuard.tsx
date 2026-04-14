import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

type BackendIssue = {
  code: string
  message: string
}

const HEALTH_PATH = '/health'

export default function BackendConnectionGuard() {
  const [issue, setIssue] = useState<BackendIssue | null>(null)
  const [ignored, setIgnored] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkBackendHealth = useCallback(async () => {
    try {
      setChecking(true)
      const res = await fetch(`${apiBaseUrl()}${HEALTH_PATH}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setIssue({
          code: String(res.status),
          message: text || `Backend health check failed (${res.status})`,
        })
      } else {
        setIssue(null)
      }
    } catch (e) {
      setIssue({
        code: 'NETWORK',
        message: e instanceof Error ? e.message : 'Network request failed',
      })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void checkBackendHealth()
    const interval = window.setInterval(() => {
      void checkBackendHealth()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [checkBackendHealth])

  useEffect(() => {
    const onBackendError = (evt: Event) => {
      const custom = evt as CustomEvent<{ status: number; message: string }>
      const status = custom.detail?.status ?? 0
      const message = custom.detail?.message ?? 'Request failed'
      setIssue({
        code: status === 0 ? 'NETWORK' : String(status),
        message,
      })
      setIgnored(false)
    }
    window.addEventListener('backend:request-error', onBackendError as EventListener)
    return () => {
      window.removeEventListener('backend:request-error', onBackendError as EventListener)
    }
  }, [])

  const visible = useMemo(() => Boolean(issue) && !ignored, [issue, ignored])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[120000] bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-2xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-rose-500/30 bg-slate-900 p-7 shadow-2xl">
          <p className="text-xs uppercase tracking-wide text-rose-300">Connection error</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Backend connection failed</h2>
          <p className="mt-3 text-sm text-slate-300">
            The app cannot reach the backend right now. Some features will not work until this is resolved.
          </p>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/80 p-3">
            <p className="text-xs text-slate-400">Error code</p>
            <p className="mt-1 font-mono text-sm text-rose-300">{issue?.code}</p>
            <p className="mt-2 text-xs text-slate-500 break-all">{issue?.message}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIgnored(true)}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Ignore
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void checkBackendHealth()}
              disabled={checking}
              className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-60"
            >
              {checking ? 'Checking…' : 'Check again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
