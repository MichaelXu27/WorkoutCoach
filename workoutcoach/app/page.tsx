'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { PERSONAS, PersonaKey } from '@/lib/personas'

type Workout = {
  id?: string
  date: string
  exercise: string
  weight: number
  reps: number
  sets: number
  rpe: number
  notes?: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_ID = `session-${Math.random().toString(36).slice(2)}`

const SAMPLE_CSV = `date,exercise,weight,reps,sets,rpe,notes
2026-03-20,bench press,185,5,3,8,felt strong
2026-03-20,squat,225,5,3,8,
2026-03-22,deadlift,315,3,3,9,
2026-03-22,overhead press,115,8,3,7,
2026-03-24,bench press,190,5,3,9,
2026-03-24,squat,235,5,3,9,heavy day`

export default function Home() {
  const [tab, setTab] = useState<'upload' | 'workouts' | 'chat'>('upload')

  const [csvText, setCsvText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [workoutsError, setWorkoutsError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [persona, setPersona] = useState<PersonaKey>('strength')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'workouts') fetchWorkouts()
  }, [tab])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchWorkouts() {
    setLoadingWorkouts(true)
    setWorkoutsError(null)
    try {
      const res = await fetch(`/api/workouts?days=${days}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setWorkouts(data)
    } catch (e: unknown) {
      setWorkoutsError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingWorkouts(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target?.result as string)
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (!csvText.trim()) return
    setUploading(true)
    setUploadResult(null)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvText }),
      })
      const data = await res.json()
      setUploadResult(data)
    } catch (e: unknown) {
      setUploadResult({ error: e instanceof Error ? e.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || streaming) return
    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setStreaming(true)

    let assistantContent = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: SESSION_ID, personaKey: persona }),
      })

      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.chunk) {
              assistantContent += json.chunk
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chat failed'
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${msg}` }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">WorkoutCoach</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-8 bg-zinc-900 rounded-lg p-1 w-fit">
          {(['upload', 'workouts', 'chat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">Upload Workout CSV</h2>
              <p className="text-sm text-zinc-400">
                Supports Strong app exports or generic format: <code className="text-zinc-300">date, exercise, weight, reps, sets</code>
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Choose file
                </button>
                <span className="text-sm text-zinc-400">or paste CSV below</span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={SAMPLE_CSV}
                rows={10}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleUpload}
                disabled={!csvText.trim() || uploading}
                className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => { setCsvText(SAMPLE_CSV); setUploadResult(null) }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Load sample data
              </button>
            </div>
            {uploadResult && (
              <div className={`rounded-lg px-4 py-3 text-sm ${uploadResult.error ? 'bg-red-950 border border-red-800 text-red-300' : 'bg-green-950 border border-green-800 text-green-300'}`}>
                {uploadResult.error ? `Error: ${uploadResult.error}` : `Uploaded ${uploadResult.count} workout${uploadResult.count !== 1 ? 's' : ''} successfully`}
              </div>
            )}
          </div>
        )}

        {tab === 'workouts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Recent Workouts</h2>
              <div className="flex items-center gap-3">
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  onClick={fetchWorkouts}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
            {loadingWorkouts && <p className="text-zinc-400 text-sm">Loading...</p>}
            {workoutsError && (
              <div className="rounded-lg px-4 py-3 text-sm bg-red-950 border border-red-800 text-red-300">
                Error: {workoutsError}
              </div>
            )}
            {!loadingWorkouts && !workoutsError && workouts.length === 0 && (
              <p className="text-zinc-500 text-sm">No workouts found. Upload some data first.</p>
            )}
            {workouts.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900">
                      {['Date', 'Exercise', 'Weight', 'Reps', 'Sets', 'RPE', 'Notes'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workouts.map((w, i) => (
                      <tr key={w.id ?? i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                        <td className="px-4 py-3 text-zinc-300">{w.date}</td>
                        <td className="px-4 py-3 text-zinc-200 font-medium">{w.exercise.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-zinc-300">{w.weight}</td>
                        <td className="px-4 py-3 text-zinc-300">{w.reps}</td>
                        <td className="px-4 py-3 text-zinc-300">{w.sets}</td>
                        <td className="px-4 py-3 text-zinc-300">{w.rpe}</td>
                        <td className="px-4 py-3 text-zinc-500">{w.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Chat with your Coach</h2>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as PersonaKey)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none"
              >
                {(Object.entries(PERSONAS) as [PersonaKey, { label: string; prompt: string }][]).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {messages.length === 0 && (
                <p className="text-zinc-500 text-sm">
                  Ask your coach anything about your workouts — patterns, weak points, recovery, what to focus on next.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-white text-black rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant' ? (
                      m.content
                        ? <div className="md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                        : <span className="opacity-40">▍</span>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleChat} className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your training..."
                disabled={streaming}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? '...' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
