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
import { CHART_THEME, formatExerciseName, type ExerciseStat } from './useInsightsData'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
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
      <p className="text-zinc-400 mb-1">{label}</p>
      <div className="space-y-0.5">
        <div className="font-mono font-medium">{payload[0].value.toLocaleString()} lbs vol</div>
      </div>
    </div>
  )
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(v)
}

export default memo(function ExerciseDistribution({ data }: { data: ExerciseStat[] }) {
  if (!data.length) return null

  const chartData = data.slice(0, 8).map((d) => ({
    ...d,
    name: formatExerciseName(d.exercise),
  }))

  return (
    <div className="w-full h-full min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid
            stroke={CHART_THEME.grid}
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: CHART_THEME.axis.fontSize, fontFamily: 'var(--font-geist-mono)' }}
            axisLine={{ stroke: CHART_THEME.grid }}
            tickLine={false}
            tickFormatter={formatVolume}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: CHART_THEME.axis.stroke, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="volume"
            fill={CHART_THEME.accentMuted}
            stroke={CHART_THEME.accent}
            strokeWidth={1}
            radius={[0, 4, 4, 0]}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
