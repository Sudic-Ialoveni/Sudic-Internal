import { WidgetProps } from './WidgetRegistry'

const ACCENT: Record<string, { text: string; bg: string; dot: string }> = {
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  dot: 'bg-indigo-400' },
  sky:     { text: 'text-sky-400',     bg: 'bg-sky-500/10',     dot: 'bg-sky-400' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
  amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-400' },
  rose:    { text: 'text-rose-400',    bg: 'bg-rose-500/10',    dot: 'bg-rose-400' },
  violet:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  dot: 'bg-violet-400' },
  slate:   { text: 'text-slate-300',   bg: 'bg-slate-700/30',   dot: 'bg-slate-400' },
}

interface StatCardSettings {
  label?: string
  value?: string | number
  subtitle?: string
  trend?: number        // positive = up, negative = down (as a % or absolute)
  trendLabel?: string   // e.g. "vs last week"
  color?: string        // one of ACCENT keys
  icon?: string         // emoji icon
}

export default function StatCard({ settings }: WidgetProps) {
  const {
    label = 'Metric',
    value = '—',
    subtitle,
    trend,
    trendLabel = 'vs last period',
    color = 'indigo',
    icon,
  } = (settings as StatCardSettings) || {}

  const accent = ACCENT[color] ?? ACCENT.indigo
  const trendUp = typeof trend === 'number' && trend > 0
  const trendDown = typeof trend === 'number' && trend < 0
  const hasTrend = typeof trend === 'number' && trend !== 0

  return (
    <div className="flex flex-col justify-between h-full min-h-[120px] p-5">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <span className={`text-lg h-8 w-8 flex items-center justify-center rounded-lg ${accent.bg}`}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mt-3">
        <p className={`text-3xl font-bold tabular-nums ${accent.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {/* Trend */}
      {hasTrend && (
        <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${trendUp ? 'text-emerald-400' : trendDown ? 'text-rose-400' : 'text-slate-500'}`}>
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={trendUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
          <span>{Math.abs(trend as number)}%</span>
          <span className="text-slate-600 font-normal">{trendLabel}</span>
        </div>
      )}
    </div>
  )
}
