'use client'

import { memo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { CHART_THEME } from './useInsightsData'

interface ProgressionChartProps {
  data: Record<string, string | number>[]
  exercises: string[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs border shadow-lg"
      style={{
        backgroundColor: CHART_THEME.tooltip.bg,
        borderColor: CHART_THEME.tooltip.border,
        color: CHART_THEME.tooltip.text,
      }}
    >
      <p className="text-zinc-500 mb-1 font-mono">{label}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-zinc-400">{p.name}:</span>
            <span className="font-mono font-medium">{p.value} lbs</span>
          </div>
        ))}
    </div>
  )
}

export default memo(function ProgressionChart({ data, exercises }: ProgressionChartProps) {
  if (!data.length) return null

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid
            stroke={CHART_THEME.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={{ stroke: CHART_THEME.grid }}
            tickLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={false}
            tickLine={false}
            unit=" lbs"
          />
          <Tooltip content={<ChartTooltip />} />
          {exercises.map((ex, i) => (
            <Line
              key={ex}
              type="monotone"
              dataKey={ex}
              stroke={CHART_THEME.accentLevels[i] || CHART_THEME.accentLevels[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_THEME.accent, strokeWidth: 0 }}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})
