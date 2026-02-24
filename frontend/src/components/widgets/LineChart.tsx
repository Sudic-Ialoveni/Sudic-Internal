import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import { WidgetProps } from './WidgetRegistry'

interface SeriesConfig {
  key: string
  label?: string
  color?: string
}

interface LineChartSettings {
  title?: string
  subtitle?: string
  data?: Record<string, unknown>[]
  xKey?: string
  // Single series shorthand
  yKey?: string
  color?: string
  // Multi-series
  series?: SeriesConfig[]
  filled?: boolean   // area chart variant
  smooth?: boolean   // curved lines
  showGrid?: boolean
  showLegend?: boolean
  showDots?: boolean
}

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.stroke || p.color }} className="font-medium">
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function LineChart({ settings }: WidgetProps) {
  const {
    title,
    subtitle,
    data = [],
    xKey = 'name',
    yKey,
    color,
    series,
    filled = false,
    smooth = true,
    showGrid = true,
    showLegend = false,
    showDots = false,
  } = (settings as LineChartSettings) || {}

  const resolvedSeries: SeriesConfig[] = series?.length
    ? series
    : yKey
      ? [{ key: yKey, label: yKey, color: color || DEFAULT_COLORS[0] }]
      : []

  const curveType = smooth ? 'monotone' : 'linear'

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
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {filled ? (
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />}
                <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
                {resolvedSeries.map((s, i) => {
                  const c = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                  return (
                    <Area
                      key={s.key}
                      type={curveType}
                      dataKey={s.key}
                      name={s.label || s.key}
                      stroke={c}
                      fill={c}
                      fillOpacity={0.12}
                      strokeWidth={2}
                      dot={showDots ? { fill: c, r: 3, strokeWidth: 0 } : false}
                      activeDot={{ r: 4, fill: c, strokeWidth: 0 }}
                    />
                  )
                })}
              </AreaChart>
            ) : (
              <ReLineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />}
                <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
                {resolvedSeries.map((s, i) => {
                  const c = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                  return (
                    <Line
                      key={s.key}
                      type={curveType}
                      dataKey={s.key}
                      name={s.label || s.key}
                      stroke={c}
                      strokeWidth={2}
                      dot={showDots ? { fill: c, r: 3, strokeWidth: 0 } : false}
                      activeDot={{ r: 4, fill: c, strokeWidth: 0 }}
                    />
                  )
                })}
              </ReLineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
