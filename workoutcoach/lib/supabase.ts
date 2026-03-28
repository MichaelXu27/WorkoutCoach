import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Workout = {
  id?: string
  date: string
  exercise: string
  weight: number
  reps: number
  sets: number
  rpe: number
  notes?: string
}

export async function insertWorkouts(workouts: Workout[]) {
  const { data, error } = await supabase
    .from('workouts')
    .insert(workouts)
    .select()
  if (error) throw error
  return data
}

export async function getRecentWorkouts(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', startDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateWorkout(id: string, fields: Partial<Omit<Workout, 'id'>>) {
  const { data, error } = await supabase
    .from('workouts')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getExerciseStats(exercise: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('exercise', exercise.toLowerCase().replace(/\s+/g, '_'))
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}
