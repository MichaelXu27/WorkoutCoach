'use client'

import { useState } from 'react'
import type { Workout } from '@/lib/supabase'

type WorkoutCardsProps = {
  workouts: Workout[]
  expandedExercise: string | null
  onToggleExercise: (key: string) => void
  editable?: boolean
  onUpdate?: (id: string, fields: Partial<Workout>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onAdd?: (workout: Omit<Workout, 'id'>) => Promise<void>
}

function EditableSet({
  row,
  idx,
  onSave,
  onDelete,
}: {
  row: Workout
  idx: number
  onSave: (id: string, fields: Partial<Workout>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(row.weight)
  const [reps, setReps] = useState(row.reps)
  const [rpe, setRpe] = useState(row.rpe)
  const [notes, setNotes] = useState(row.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!row.id) return
    setSaving(true)
    try {
      await onSave(row.id, { weight, reps, rpe, notes: notes || undefined })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!row.id) return
    setSaving(true)
    try {
      await onDelete(row.id)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-xs py-1.5 px-1">
        <span className="text-zinc-500 w-10 shrink-0">Set {idx + 1}</span>
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-16 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          placeholder="lbs"
        />
        <span className="text-zinc-600">×</span>
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(Number(e.target.value))}
          className="w-14 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          placeholder="reps"
        />
        <span className="text-zinc-600">@</span>
        <input
          type="number"
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          className="w-14 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          placeholder="RPE"
          min={1}
          max={10}
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 min-w-0"
          placeholder="notes"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40 text-xs font-medium"
        >
          Save
        </button>
        <button
          onClick={() => {
            setWeight(row.weight)
            setReps(row.reps)
            setRpe(row.rpe)
            setNotes(row.notes ?? '')
            setEditing(false)
          }}
          className="text-zinc-500 hover:text-zinc-300 text-xs"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between text-xs text-zinc-400 py-1 group">
      <span>Set {idx + 1}</span>
      <div className="flex items-center gap-2">
        <span>
          {row.weight} lb × {row.reps}
          {row.rpe ? ` @ RPE ${row.rpe}` : ''}
          {row.notes ? ` — ${row.notes}` : ''}
        </span>
        {row.id && (
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true) }}
              className="text-zinc-600 hover:text-zinc-300 text-[10px] px-1"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              disabled={saving}
              className="text-zinc-600 hover:text-red-400 text-[10px] px-1 disabled:opacity-40"
            >
              Del
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddSetForm({
  date,
  exercise,
  onAdd,
}: {
  date: string
  exercise: string
  onAdd: (workout: Omit<Workout, 'id'>) => Promise<void>
}) {
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(0)
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (weight <= 0 || reps <= 0) return
    setSaving(true)
    try {
      await onAdd({ date, exercise, weight, reps, sets: 1, rpe, notes: notes || undefined })
      setWeight(0)
      setReps(0)
      setNotes('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs py-1.5 px-1 border-t border-zinc-800/30 mt-1">
      <span className="text-zinc-600 w-10 shrink-0">+ Set</span>
      <input
        type="number"
        value={weight || ''}
        onChange={(e) => setWeight(Number(e.target.value))}
        className="w-16 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        placeholder="lbs"
      />
      <span className="text-zinc-600">×</span>
      <input
        type="number"
        value={reps || ''}
        onChange={(e) => setReps(Number(e.target.value))}
        className="w-14 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        placeholder="reps"
      />
      <span className="text-zinc-600">@</span>
      <input
        type="number"
        value={rpe}
        onChange={(e) => setRpe(Number(e.target.value))}
        className="w-14 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        placeholder="RPE"
        min={1}
        max={10}
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 min-w-0"
        placeholder="notes"
      />
      <button
        onClick={handleAdd}
        disabled={saving || weight <= 0 || reps <= 0}
        className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40 text-xs font-medium"
      >
        Add
      </button>
    </div>
  )
}

export default function WorkoutCards({
  workouts,
  expandedExercise,
  onToggleExercise,
  editable = false,
  onUpdate,
  onDelete,
  onAdd,
}: WorkoutCardsProps) {
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
          <div key={date} className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/30">
              <p className="text-sm font-semibold tracking-tight text-zinc-200">{formattedDate}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
                <span className="font-mono">{totalVolume.toLocaleString()} lb</span>
                <span>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/30">
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
                      <span className="text-sm text-zinc-400 font-mono">
                        {agg.bestWeight} lb × {agg.bestReps}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="bg-zinc-950/50 px-5 py-2 space-y-1">
                        {editable && onUpdate && onDelete ? (
                          agg.rows.map((r, idx) => (
                            <EditableSet key={r.id ?? idx} row={r} idx={idx} onSave={onUpdate} onDelete={onDelete} />
                          ))
                        ) : (
                          agg.rows.map((r, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-zinc-400 py-1">
                              <span>Set {idx + 1}</span>
                              <span>{r.weight} lb × {r.reps} × {r.sets}{r.rpe ? ` @ RPE ${r.rpe}` : ''}{r.notes ? ` — ${r.notes}` : ''}</span>
                            </div>
                          ))
                        )}
                        {editable && onAdd && (
                          <AddSetForm date={date} exercise={exercise} onAdd={onAdd} />
                        )}
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
