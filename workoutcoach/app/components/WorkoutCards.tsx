'use client'

import type { Workout } from '@/lib/supabase'

type WorkoutCardsProps = {
  workouts: Workout[]
  expandedExercise: string | null
  onToggleExercise: (key: string) => void
}

export default function WorkoutCards({ workouts, expandedExercise, onToggleExercise }: WorkoutCardsProps) {
  const grouped = workouts.reduce((acc, w) => {
    (acc[w.date] ??= []).push(w)
    return acc
  }, {} as Record<string, Workout[]>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, dayWorkouts]) => {
        const totalVolume = dayWorkouts.reduce((sum, w) => sum + w.weight * w.reps * w.sets, 0)

        const exerciseMap = new Map<string, { totalSets: number; bestWeight: number; bestReps: number; rows: Workout[] }>()
        for (const w of dayWorkouts) {
          const existing = exerciseMap.get(w.exercise)
          if (!existing) {
            exerciseMap.set(w.exercise, { totalSets: w.sets, bestWeight: w.weight, bestReps: w.reps, rows: [w] })
          } else {
            existing.totalSets += w.sets
            existing.rows.push(w)
            if (w.weight > existing.bestWeight || (w.weight === existing.bestWeight && w.reps > existing.bestReps)) {
              existing.bestWeight = w.weight
              existing.bestReps = w.reps
            }
          }
        }

        const exerciseCount = exerciseMap.size
        const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })

        return (
          <div key={date} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/50">
              <p className="text-sm font-medium text-zinc-200">{formattedDate}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
                <span>{totalVolume.toLocaleString()} lb</span>
                <span>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/50">
              <div className="flex items-center justify-between px-5 py-2">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Exercise</span>
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Best Set</span>
              </div>
              {Array.from(exerciseMap.entries()).map(([exercise, agg]) => {
                const key = `${date}:${exercise}`
                const isExpanded = expandedExercise === key
                return (
                  <div key={exercise}>
                    <div
                      onClick={() => onToggleExercise(isExpanded ? null! : key)}
                      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <span className="text-sm text-zinc-200">
                        <span className="text-zinc-500">{agg.totalSets} ×</span>{' '}
                        <span className="font-medium capitalize">{exercise.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-sm text-zinc-400">
                        {agg.bestWeight} lb × {agg.bestReps}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="bg-zinc-950/50 px-5 py-2 space-y-1">
                        {agg.rows.map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-zinc-400 py-1">
                            <span>Set {idx + 1}</span>
                            <span>{r.weight} lb × {r.reps} × {r.sets}{r.rpe ? ` @ RPE ${r.rpe}` : ''}{r.notes ? ` — ${r.notes}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
