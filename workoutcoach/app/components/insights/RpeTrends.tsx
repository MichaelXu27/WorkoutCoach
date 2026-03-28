'use client'

import { memo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { CHART_THEME, type RpePoint } from './useInsightsData'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
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
      <span className="font-mono font-medium">RPE {payload[0].value}</span>
    </div>
  )
}

export default memo(function RpeTrends({ data }: { data: RpePoint[] }) {
  if (!data.length) return null

  return (
    <div className="w-full h-full min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_THEME.accent} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_THEME.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            domain={[1, 10]}
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={8} stroke="rgba(239, 68, 68, 0.3)" strokeDasharray="4 4" />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="avgRpe"
            stroke={CHART_THEME.accent}
            fill="url(#rpeGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: CHART_THEME.accent, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})
