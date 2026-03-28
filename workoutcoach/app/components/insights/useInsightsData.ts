'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Workout } from '@/lib/supabase'

export const CHART_THEME = {
  grid: 'rgba(63, 63, 70, 0.3)',
  axis: { stroke: 'rgb(113, 113, 122)', fontSize: 11 },
  accent: 'rgb(16, 185, 129)',
  accentMuted: 'rgba(16, 185, 129, 0.15)',
  accentLevels: [
    'rgb(16, 185, 129)',
    'rgba(16, 185, 129, 0.6)',
    'rgba(16, 185, 129, 0.35)',
    'rgba(16, 185, 129, 0.2)',
    'rgba(16, 185, 129, 0.12)',
  ],
  tooltip: {
    bg: 'rgb(24, 24, 27)',
    border: 'rgb(39, 39, 42)',
    text: 'rgb(228, 228, 231)',
  },
}

export type ProgressionPoint = { date: string; weight: number; reps: number }
export type VolumeDay = { date: string; volume: number }
export type ExerciseStat = { exercise: string; count: number; volume: number }
export type RpePoint = { date: string; avgRpe: number }
export type PersonalRecord = {
  exercise: string
  weight: number
  reps: number
  date: string
}
export type WeekVolume = { week: string; volume: number }

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function formatExerciseName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export { formatExerciseName }

export function useInsightsData() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(90)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workouts?days=${days}`)
      if (!res.ok) throw new Error('Failed to fetch workouts')
      const data = await res.json()
      setWorkouts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const exerciseList = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const w of workouts) {
      freq[w.exercise] = (freq[w.exercise] || 0) + 1
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([ex]) => ex)
  }, [workouts])

  const progressionData = useMemo(() => {
    const filtered = selectedExercise
      ? workouts.filter((w) => w.exercise === selectedExercise)
      : workouts

    const grouped: Record<string, Record<string, { maxWeight: number; reps: number }>> = {}
    for (const w of filtered) {
      const ex = w.exercise
      if (!grouped[ex]) grouped[ex] = {}
      if (!grouped[ex][w.date] || w.weight > grouped[ex][w.date].maxWeight) {
        grouped[ex][w.date] = { maxWeight: w.weight, reps: w.reps }
      }
    }

    const exercises = selectedExercise ? [selectedExercise] : exerciseList.slice(0, 4)
    const allDates = [...new Set(filtered.map((w) => w.date))].sort()

    return {
      exercises: exercises.map(formatExerciseName),
      exerciseKeys: exercises,
      dates: allDates,
      data: allDates.map((date) => {
        const point: Record<string, string | number> = { date }
        for (const ex of exercises) {
          const key = formatExerciseName(ex)
          point[key] = grouped[ex]?.[date]?.maxWeight ?? 0
        }
        return point
      }),
    }
  }, [workouts, selectedExercise, exerciseList])

  const volumeByDay = useMemo<VolumeDay[]>(() => {
    const vol: Record<string, number> = {}
    for (const w of workouts) {
      vol[w.date] = (vol[w.date] || 0) + w.weight * w.reps * w.sets
    }
    return Object.entries(vol)
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [workouts])

  const exerciseDistribution = useMemo<ExerciseStat[]>(() => {
    const stats: Record<string, { count: number; volume: number }> = {}
    for (const w of workouts) {
      if (!stats[w.exercise]) stats[w.exercise] = { count: 0, volume: 0 }
      stats[w.exercise].count += 1
      stats[w.exercise].volume += w.weight * w.reps * w.sets
    }
    return Object.entries(stats)
      .map(([exercise, s]) => ({ exercise, ...s }))
      .sort((a, b) => b.volume - a.volume)
  }, [workouts])

  const rpeByDate = useMemo<RpePoint[]>(() => {
    const grouped: Record<string, { sum: number; count: number }> = {}
    for (const w of workouts) {
      if (w.rpe > 0) {
        if (!grouped[w.date]) grouped[w.date] = { sum: 0, count: 0 }
        grouped[w.date].sum += w.rpe
        grouped[w.date].count += 1
      }
    }
    return Object.entries(grouped)
      .map(([date, { sum, count }]) => ({ date, avgRpe: Math.round((sum / count) * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [workouts])

  const personalRecords = useMemo<PersonalRecord[]>(() => {
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
    const maxByExercise: Record<string, number> = {}
    const prs: PersonalRecord[] = []

    for (const w of sorted) {
      const prev = maxByExercise[w.exercise] || 0
      if (w.weight > prev) {
        maxByExercise[w.exercise] = w.weight
        prs.push({
          exercise: w.exercise,
          weight: w.weight,
          reps: w.reps,
          date: w.date,
        })
      }
    }
    return prs.reverse().slice(0, 6)
  }, [workouts])

  const weeklyVolume = useMemo<WeekVolume[]>(() => {
    const vol: Record<string, number> = {}
    for (const w of workouts) {
      const week = getISOWeek(w.date)
      vol[week] = (vol[week] || 0) + w.weight * w.reps * w.sets
    }
    return Object.entries(vol)
      .map(([week, volume]) => ({ week, volume }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }, [workouts])

  return {
    workouts,
    loading,
    error,
    days,
    setDays,
    selectedExercise,
    setSelectedExercise,
    exerciseList,
    progressionData,
    volumeByDay,
    exerciseDistribution,
    rpeByDate,
    personalRecords,
    weeklyVolume,
    retry: fetchData,
  }
}
