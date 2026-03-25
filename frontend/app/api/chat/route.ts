import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getRecentWorkouts } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const COACH_SYSTEM_PROMPT = `You are an expert strength coach analyzing workout history.

Your job:
1. Identify patterns: frequency (how often per muscle group), intensity (RPE, max reps), volume trends
2. Spot weak points: exercises with low frequency, stalled progression, imbalances
3. Assess recovery state: accumulated fatigue, CNS burnout risk, deload timing
4. Provide specific, actionable coaching advice
5. Always reference actual numbers from their workouts

Be concise, data-driven, and specific. Never generic.`

// In-memory conversation store (per-process, resets on deploy)
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>()

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json()

    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: 'Message and sessionId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const history = conversations.get(sessionId) ?? []

    const workouts = await getRecentWorkouts(30)
    const workoutContext =
      workouts.length > 0
        ? workouts
            .slice(0, 10)
            .map(
              (w) =>
                `${w.date}: ${w.exercise} ${w.weight}×${w.reps}×${w.sets} RPE ${w.rpe}${w.notes ? ` (${w.notes})` : ''}`
            )
            .join('\n')
        : 'No workouts uploaded yet.'

    const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      {
        role: 'user',
        content: `Recent workouts:\n${workoutContext}\n\nUser question: ${message}`,
      },
    ]

    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = anthropic.messages.stream({
            model: 'claude-opus-4-5',
            max_tokens: 500,
            system: COACH_SYSTEM_PROMPT,
            messages: updatedHistory,
          })

          anthropicStream.on('text', (text) => {
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
          })

          anthropicStream.on('end', () => {
            conversations.set(sessionId, [
              ...updatedHistory,
              { role: 'assistant', content: fullResponse },
            ])
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
            controller.close()
          })

          anthropicStream.on('error', (err) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            )
            controller.close()
          })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Stream failed'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Chat failed'
    console.error('Chat handler error:', error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
