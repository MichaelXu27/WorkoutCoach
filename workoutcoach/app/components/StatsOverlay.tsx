'use client'

import type { StatsOverlayProps } from '@/lib/videoTypes'

export default function StatsOverlay({ stats, onRequestCoaching }: StatsOverlayProps) {
  const confPercent = Math.round(stats.confidence * 100)

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-300">Set Summary</h3>
        <span className="text-xs text-zinc-500 capitalize">{stats.phase}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Exercise</p>
          <p className="text-sm font-medium text-zinc-100 capitalize">{stats.exercise}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Reps</p>
          <p className="text-2xl font-bold text-zinc-100 font-mono">{stats.repCount}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Confidence</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  confPercent > 70 ? 'bg-emerald-500' : confPercent > 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confPercent}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono">{confPercent}%</span>
          </div>
        </div>
      </div>

      <button
        onClick={onRequestCoaching}
        disabled={stats.repCount === 0}
        className="w-full px-4 py-2.5 bg-zinc-100 text-zinc-950 rounded-xl text-sm font-medium hover:bg-white active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Get Coaching Feedback
      </button>
    </div>
  )
}
