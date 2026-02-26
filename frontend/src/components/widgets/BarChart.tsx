import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { WidgetProps } from './WidgetRegistry'

interface SeriesConfig {
  key: string
  label?: string
  color?: string
}

interface BarChartSettings {
  title?: string
  subtitle?: string
  data?: Record<string, unknown>[]
  xKey?: string
  // Simple single-series shorthand
  yKey?: string
  color?: string
  // Multi-series
  series?: SeriesConfig[]
  stacked?: boolean
  showGrid?: boolean
  showLegend?: boolean
}

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }} className="font-medium">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function BarChart({ settings }: WidgetProps) {
  const {
    title,
    subtitle,
    data = [],
    xKey = 'name',
    yKey,
    color,
    series,
    stacked = false,
    showGrid = true,
    showLegend = false,
  } = (settings as BarChartSettings) || {}

  // Normalise to series array
  const resolvedSeries: SeriesConfig[] = series?.length
    ? series
    : yKey
      ? [{ key: yKey, label: yKey, color: color || DEFAULT_COLORS[0] }]
      : []

  return (
    <div className="flex flex-col h-full min-h-[220px] p-5">
      {(title || subtitle) && (
        <div className="mb-3 flex-shrink-0">
          {title && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-600">No data</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <ReBarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }} barCategoryGap="30%">
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />}
              <XAxis
                dataKey={xKey}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
              {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
              {resolvedSeries.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label || s.key}
                  fill={s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  radius={[3, 3, 0, 0]}
                  stackId={stacked ? 'stack' : undefined}
                  maxBarSize={48}
                />
              ))}
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
