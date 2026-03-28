'use client'

import { useState } from 'react'
import type { Workout } from '@/lib/supabase'

type AddExerciseFormProps = {
  onAdd: (workout: Omit<Workout, 'id'>) => Promise<void>
}

export default function AddExerciseForm({ onAdd }: AddExerciseFormProps) {
  const [exercise, setExercise] = useState('')
  const [weight, setWeight] = useState(0)
  const [reps, setReps] = useState(0)
  const [sets, setSets] = useState(1)
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!exercise.trim() || weight <= 0 || reps <= 0) return
    setSaving(true)
    try {
      await onAdd({
        date,
        exercise: exercise.trim().toLowerCase().replace(/\s+/g, '_'),
        weight,
        reps,
        sets,
        rpe,
        notes: notes.trim() || undefined,
      })
      setExercise('')
      setWeight(0)
      setReps(0)
      setSets(1)
      setRpe(7)
      setNotes('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">Add Exercise</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-zinc-500 mb-1">Exercise</label>
          <input
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="e.g. bench press"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-zinc-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Weight (lb)</label>
          <input
            type="number"
            value={weight || ''}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Reps</label>
          <input
            type="number"
            value={reps || ''}
            onChange={(e) => setReps(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Sets</label>
          <input
            type="number"
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            min={1}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">RPE</label>
          <input
            type="number"
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            min={1}
            max={10}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-zinc-500 mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt strong, paused reps"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!exercise.trim() || weight <= 0 || reps <= 0 || saving}
        className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Adding...' : 'Add to Log'}
      </button>
    </form>
  )
}
