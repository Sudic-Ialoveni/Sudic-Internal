import { useEffect, useState } from 'react'
import { WidgetProps } from './WidgetRegistry'

interface DayData {
  total: number
  date: string
}

export default function MoizvonkiAnalytics({ settings }: WidgetProps) {
  const {
    title = 'Call Analytics',
    dateRange = '7d',
    type = 'inbound',
  } = (settings as Record<string, string>) || {}

  const [data, setData] = useState<DayData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [type, dateRange])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      setErrored(false)
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`/api/analytics/moizvonki?type=${type}&dateRange=${dateRange}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      setData(json.data || [])
      setTotal(json.total || 0)
    } catch {
      setErrored(true)
    } finally {
      setLoading(false)
    }
  }

  const typeConfig: Record<string, { label: string; color: string; barColor: string }> = {
    inbound:  { label: 'Inbound Calls',  color: 'text-sky-400',     barColor: 'bg-sky-500/60' },
    outbound: { label: 'Outbound Calls', color: 'text-emerald-400', barColor: 'bg-emerald-500/60' },
    missed:   { label: 'Missed Calls',   color: 'text-rose-400',    barColor: 'bg-rose-500/60' },
  }
  const cfg = typeConfig[type] ?? typeConfig.inbound
  const rangeLabel = dateRange === '7d' ? '7 days' : '30 days'
  const maxVal = Math.max(...data.map(d => d.total), 1)

  return (
    <div className="flex flex-col h-full min-h-0 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Moizvonki</p>
          <h3 className="text-sm font-semibold text-slate-200 mt-0.5">{title || cfg.label}</h3>
        </div>
        <span className="text-xs text-slate-600 bg-slate-700/50 px-2 py-0.5 rounded-full">{rangeLabel}</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 100, 200].map(d => (
              <span key={d} className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      ) : errored ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-500">Could not load data</p>
        </div>
      ) : (
        <>
          {/* Big number */}
          <div className="flex items-baseline gap-2 mb-5 flex-shrink-0">
            <span className={`text-4xl font-bold tabular-nums ${cfg.color}`}>{total.toLocaleString()}</span>
            <span className="text-sm text-slate-500">total</span>
          </div>

          {/* Daily breakdown */}
          {data.length > 0 && (
            <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto">
              {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0 tabular-nums">
                    {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cfg.barColor}`}
                      style={{ width: `${Math.max(2, (item.total / maxVal) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right flex-shrink-0 tabular-nums">{item.total}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
