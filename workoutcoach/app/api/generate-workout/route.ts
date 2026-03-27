import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getRecentWorkouts } from '@/lib/supabase'
import { PERSONAS, PersonaKey } from '@/lib/personas'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt, personaKey } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const key: PersonaKey = personaKey && personaKey in PERSONAS ? personaKey : 'strength'
    const personaLabel = PERSONAS[key].label

    const workouts = await getRecentWorkouts(30)
    const workoutContext =
      workouts.length > 0
        ? workouts
            .slice(0, 15)
            .map(
              (w) =>
                `${w.date}: ${w.exercise} ${w.weight}×${w.reps}×${w.sets} RPE ${w.rpe}${w.notes ? ` (${w.notes})` : ''}`
            )
            .join('\n')
        : 'No workout history available. Use conservative weights.'

    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You are a ${personaLabel} generating a structured workout plan.

The user's recent training history:
${workoutContext}

Generate a workout plan based on the user's request. Return ONLY a valid JSON array with no markdown formatting, no code fences, no explanation text. Each object must have exactly these fields:
- date: string (YYYY-MM-DD format, use today's date: ${today})
- exercise: string (lowercase, underscores for spaces, e.g. "bench_press", "lat_pulldown")
- weight: number (in lbs, based on the user's recent history when available)
- reps: number
- sets: number (the set number, e.g. 1, 2, 3)
- rpe: number (1-10 scale)
- notes: string (brief coaching cue or empty string)

Create multiple entries per exercise (one per set) so the user can see each individual set. Match the user's typical working weights from their history when possible. If no history exists for an exercise, use conservative estimates.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Strip markdown fences if present
    const cleaned = rawText
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 422 })
    }

    // Normalize and validate each workout entry
    const workoutPlan = parsed.map((w: Record<string, unknown>) => ({
      date: typeof w.date === 'string' ? w.date : today,
      exercise: typeof w.exercise === 'string'
        ? w.exercise.toLowerCase().replace(/\s+/g, '_')
        : 'unknown',
      weight: typeof w.weight === 'number' ? w.weight : 0,
      reps: typeof w.reps === 'number' ? w.reps : 0,
      sets: typeof w.sets === 'number' ? w.sets : 1,
      rpe: typeof w.rpe === 'number' ? w.rpe : 5,
      notes: typeof w.notes === 'string' ? w.notes : '',
    }))

    return NextResponse.json(workoutPlan)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    console.error('Generate workout error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
