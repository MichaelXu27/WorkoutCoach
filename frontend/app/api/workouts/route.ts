import { NextRequest, NextResponse } from 'next/server'
import { getRecentWorkouts } from '@/lib/supabase'

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
