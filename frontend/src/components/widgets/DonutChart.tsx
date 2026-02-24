import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { WidgetProps } from './WidgetRegistry'

interface Segment {
  name: string
  value: number
  color?: string
}

interface DonutChartSettings {
  title?: string
  subtitle?: string
  segments?: Segment[]
  // convenience: if data is array of objects with name + value
  data?: Segment[]
  showLegend?: boolean
  innerLabel?: string   // text shown in the hole
  innerSubLabel?: string
  donut?: boolean       // false = pie, true = donut (default)
}

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const total = p.payload?.total
  const pct = total ? ((p.value / total) * 100).toFixed(1) : null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p style={{ color: p.fill }} className="font-medium">{p.name}</p>
      <p className="text-slate-300">{p.value?.toLocaleString()}{pct ? ` (${pct}%)` : ''}</p>
    </div>
  )
}

const renderLegend = (props: any) => {
  const { payload } = props
  return (
    <div className="flex flex-col gap-1.5 pl-2">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400 truncate">{entry.value}</span>
          <span className="text-slate-500 ml-auto pl-2 tabular-nums">{entry.payload?.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function DonutChart({ settings }: WidgetProps) {
  const {
    title,
    subtitle,
    segments,
    data,
    showLegend = true,
    innerLabel,
    innerSubLabel,
    donut = true,
  } = (settings as DonutChartSettings) || {}

  const rawData = segments || data || []
  const total = rawData.reduce((s, d) => s + (d.value || 0), 0)
  // Attach total to each entry for tooltip %
  const chartData = rawData.map(d => ({ ...d, total }))

  return (
    <div className="flex flex-col h-full min-h-[220px] p-5">
      {(title || subtitle) && (
        <div className="mb-3 flex-shrink-0">
          {title && <h3 className="text-sm font-semibold text-slate-200">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-slate-600">No data</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={donut ? '52%' : '0%'}
                outerRadius="80%"
                dataKey="value"
                strokeWidth={0}
                paddingAngle={chartData.length > 1 ? 2 : 0}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  content={renderLegend}
                  wrapperStyle={{ maxWidth: '45%' }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Centre label for donut */}
          {donut && innerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-lg font-bold text-white">{innerLabel}</p>
              {innerSubLabel && <p className="text-xs text-slate-500">{innerSubLabel}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
