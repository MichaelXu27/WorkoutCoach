'use client'

import { memo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { CHART_THEME, type WeekVolume } from './useInsightsData'

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
      <span className="font-mono font-medium">
        {payload[0].value.toLocaleString()} lbs
      </span>
    </div>
  )
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

export default memo(function WeeklyVolume({ data }: { data: WeekVolume[] }) {
  if (!data.length) return null

  return (
    <div className="w-full h-full min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid
            stroke={CHART_THEME.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={{ stroke: CHART_THEME.grid }}
            tickLine={false}
            tickFormatter={(v: string) => v.split('-')[1] || v}
          />
          <YAxis
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatVolume}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="volume"
            fill={CHART_THEME.accent}
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
