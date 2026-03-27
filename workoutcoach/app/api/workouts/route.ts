import { NextRequest, NextResponse } from 'next/server'
import { getRecentWorkouts, insertWorkouts } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const days = parseInt(searchParams.get('days') ?? '30', 10)
    const workouts = await getRecentWorkouts(days)
    return NextResponse.json(workouts)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch workouts'
    console.error('Fetch workouts error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workouts } = await req.json()

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return NextResponse.json({ error: 'workouts array is required' }, { status: 400 })
    }

    const data = await insertWorkouts(workouts)
    return NextResponse.json({ success: true, count: data.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save workouts'
    console.error('Save workouts error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
