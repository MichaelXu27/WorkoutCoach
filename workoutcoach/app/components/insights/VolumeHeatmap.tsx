'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { VolumeDay } from './useInsightsData'

const SPRING = { type: 'spring' as const, stiffness: 100, damping: 20 }

function getOpacity(value: number, max: number): number {
  if (max === 0 || value === 0) return 0
  const normalized = value / max
  return 0.15 + normalized * 0.85
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default memo(function VolumeHeatmap({ data, days }: { data: VolumeDay[]; days: number }) {
  const { grid, maxVolume, weeks } = useMemo(() => {
    const volMap: Record<string, number> = {}
    let max = 0
    for (const d of data) {
      volMap[d.date] = d.volume
      if (d.volume > max) max = d.volume
    }

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - days)
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const cells: { date: string; volume: number; dayOfWeek: number; weekIndex: number }[] = []
    const weekCount = Math.ceil((days + 7) / 7)
    const d = new Date(startDate)

    for (let w = 0; w < weekCount; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const dateStr = d.toISOString().split('T')[0]
        const isFuture = d > today
        cells.push({
          date: dateStr,
          volume: isFuture ? -1 : (volMap[dateStr] || 0),
          dayOfWeek: dow,
          weekIndex: w,
        })
        d.setDate(d.getDate() + 1)
      }
    }

    return { grid: cells, maxVolume: max, weeks: weekCount }
  }, [data, days])

  return (
    <div className="w-full h-full flex flex-col gap-1">
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] pr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[14px] w-4 flex items-center justify-end">
              {i % 2 === 1 && (
                <span className="text-[9px] text-zinc-600 font-mono">{label}</span>
              )}
            </div>
          ))}
        </div>
        <div
          className="grid gap-[3px] flex-1"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gridTemplateRows: 'repeat(7, 14px)',
            gridAutoFlow: 'column',
          }}
        >
          {grid.map((cell, i) => (
            <motion.div
              key={cell.date}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: Math.min(i * 0.003, 0.6) }}
              className="rounded-[3px] relative group"
              style={{
                backgroundColor:
                  cell.volume < 0
                    ? 'transparent'
                    : cell.volume === 0
                      ? 'rgba(39, 39, 42, 0.5)'
                      : `rgba(16, 185, 129, ${getOpacity(cell.volume, maxVolume)})`,
              }}
              title={cell.volume >= 0 ? `${cell.date}: ${cell.volume.toLocaleString()} lbs` : ''}
            >
              {cell.volume > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {cell.volume.toLocaleString()} lbs
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end mt-1">
        <span className="text-[10px] text-zinc-600">Less</span>
        <div className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className="w-[10px] h-[10px] rounded-[2px]"
              style={{
                backgroundColor:
                  level === 0
                    ? 'rgba(39, 39, 42, 0.5)'
                    : `rgba(16, 185, 129, ${0.15 + level * 0.85})`,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-zinc-600">More</span>
      </div>
    </div>
  )
})
