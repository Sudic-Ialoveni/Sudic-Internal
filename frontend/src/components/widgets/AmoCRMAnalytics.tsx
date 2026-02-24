import { useEffect, useState } from 'react'
import { WidgetProps } from './WidgetRegistry'

interface DataPoint {
  value: number
  formattedValue: string
  trend?: number
  date: string
}

export default function AmoCRMAnalytics({ settings }: WidgetProps) {
  const {
    title = 'AmoCRM Analytics',
    metric = 'total_properties',
    dateRange = '7d',
  } = (settings as Record<string, string>) || {}

  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [metric, dateRange])

  function formatNumber(value: number) {
    if (metric.includes('area')) return `${Math.round(value).toLocaleString()} m²`
    return value.toLocaleString()
  }

  async function fetchAnalytics() {
    try {
      setLoading(true)
      setErrored(false)
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`/api/analytics/amo?metric=${metric}&dateRange=${dateRange}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      setData(json.data || [])
    } catch {
      setErrored(true)
    } finally {
      setLoading(false)
    }
  }

  function getMetricLabel() {
    const labels: Record<string, string> = {
      total_properties: 'Total Imobile',
      total_area: 'Suprafață Totală',
      sold_properties: 'Imobile Tranzacționate',
      sold_area: 'Suprafață Tranzacționată',
      remaining_properties: 'Imobile Rămase',
      remaining_area: 'Suprafață Rămasă',
    }
    return labels[metric] || title
  }

  const latest = data[0]
  const displayValue = latest
    ? (latest.formattedValue || formatNumber(latest.value))
    : '—'
  const trend = latest?.trend
  const rangeLabel = dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'
  const maxVal = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex flex-col h-full min-h-0 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">AmoCRM</p>
          <h3 className="text-sm font-semibold text-slate-200 mt-0.5">{getMetricLabel()}</h3>
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
          <div className="flex items-end gap-3 mb-5 flex-shrink-0">
            <span className="text-4xl font-bold text-white tabular-nums">{displayValue}</span>
            {trend !== undefined && trend !== 0 && (
              <span className={`flex items-center gap-1 text-sm font-medium mb-1 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={trend > 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                </svg>
                {Math.abs(trend)}%
              </span>
            )}
          </div>

          {/* Mini bar chart */}
          {data.length > 1 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <p className="text-xs text-slate-600 mb-2 flex-shrink-0">Trend</p>
              <div className="flex items-end gap-1 flex-1 min-h-[60px]">
                {data.slice().reverse().map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex items-end" style={{ height: '52px' }}>
                      <div
                        className="w-full bg-indigo-500/60 rounded-sm hover:bg-indigo-400/80 transition-colors"
                        style={{ height: `${Math.max(8, (item.value / maxVal) * 52)}px` }}
                        title={`${new Date(item.date).toLocaleDateString()}: ${item.formattedValue || formatNumber(item.value)}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 truncate w-full text-center">
                      {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
