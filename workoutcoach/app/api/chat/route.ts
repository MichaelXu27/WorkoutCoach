import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getRecentWorkouts } from '@/lib/supabase'
import { PERSONAS, PersonaKey } from '@/lib/personas'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// In-memory conversation store (per-process, resets on deploy)
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>()

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, personaKey } = await req.json()

    if (!message || !sessionId) {
      return new Response(JSON.stringify({ error: 'Message and sessionId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const key: PersonaKey = personaKey && personaKey in PERSONAS ? personaKey : 'strength'
    const systemPrompt = PERSONAS[key].prompt

    const history = conversations.get(sessionId) ?? []

    const workouts = await getRecentWorkouts(30)
    const workoutContext =
      workouts.length > 0
        ? workouts
            .slice(0, 36)
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
            max_tokens: 2048,
            system: systemPrompt,
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
