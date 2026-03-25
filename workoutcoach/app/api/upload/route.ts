import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { insertWorkouts, Workout } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { csv_content } = await req.json()

    if (!csv_content) {
      return NextResponse.json({ error: 'No CSV content provided' }, { status: 400 })
    }

    const results = Papa.parse(csv_content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    })

    if (!results.data || results.data.length === 0) {
      return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })
    }

    const rows = results.data as Record<string, string>[]

    // Detect format: Strong app uses "Exercise Name" + "Set Order"; generic uses "exercise" + "sets"
    const isStrongFormat = rows[0] && 'Exercise Name' in rows[0]

    const workouts = rows
      .map((row): Workout | null => {
        if (isStrongFormat) {
          // Strong app CSV format
          const exercise = row['Exercise Name']
          const date = row['Date']
          const setOrder = row['Set Order']

          // Skip rest timer rows and rows missing required fields
          if (!date || !exercise || !setOrder || setOrder === 'Rest Timer') return null

          const weight = parseFloat(row['Weight'])
          const reps = parseFloat(row['Reps'])
          const setNum = parseInt(setOrder, 10)

          if (isNaN(reps) || isNaN(setNum)) return null

          return {
            date: new Date(date).toISOString().split('T')[0],
            exercise: exercise.toLowerCase().trim().replace(/\s+/g, '_'),
            weight: isNaN(weight) ? 0 : weight,
            reps: Math.round(reps),
            sets: setNum,
            rpe: 0,
            notes: row['Workout Name']?.trim() || undefined,
          }
        } else {
          // Generic format: date, exercise, weight, reps, sets, rpe, notes
          if (!row.date || !row.exercise) return null

          const weight = parseFloat(row.weight)
          const reps = parseInt(row.reps, 10)
          const sets = parseInt(row.sets, 10)

          if (isNaN(weight) || isNaN(reps) || isNaN(sets)) return null

          return {
            date: new Date(row.date).toISOString().split('T')[0],
            exercise: row.exercise.toLowerCase().trim().replace(/\s+/g, '_'),
            weight,
            reps,
            sets,
            rpe: parseInt(row.rpe, 10) || 0,
            notes: row.notes?.trim() || undefined,
          }
        }
      })
      .filter((w): w is Workout => w !== null)

    if (workouts.length === 0) {
      return NextResponse.json(
        { error: 'No valid workouts found. Check CSV format.' },
        { status: 400 }
      )
    }

    await insertWorkouts(workouts)

    return NextResponse.json({ success: true, count: workouts.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('Upload error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
