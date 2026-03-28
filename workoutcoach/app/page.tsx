'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PERSONAS, PersonaKey } from '@/lib/personas'
import { EXERCISES, EXERCISE_LABELS, type ExerciseKey, type VideoStats } from '@/lib/videoTypes'
import type { Workout } from '@/lib/supabase'
import VideoTracker from '@/app/components/VideoTracker'
import StatsOverlay from '@/app/components/StatsOverlay'
import WorkoutCards from '@/app/components/WorkoutCards'
import AddExerciseForm from '@/app/components/AddExerciseForm'

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
  const [tab, setTab] = useState<'upload' | 'workouts' | 'generate' | 'chat' | 'video'>('upload')

  const [csvText, setCsvText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [workoutsError, setWorkoutsError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [persona, setPersona] = useState<PersonaKey>('strength')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const [videoStats, setVideoStats] = useState<VideoStats | null>(null)
  const [videoExercise, setVideoExercise] = useState<ExerciseKey>('squat')

  const [generatedWorkouts, setGeneratedWorkouts] = useState<Workout[]>([])
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [expandedGenExercise, setExpandedGenExercise] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null)

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

  async function handleUpdateWorkout(id: string, fields: Partial<Workout>) {
    const res = await fetch('/api/workouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Update failed')
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...fields } : w)))
  }

  async function handleDeleteWorkout(id: string) {
    const res = await fetch('/api/workouts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Delete failed')
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
  }

  async function handleAddWorkout(workout: Omit<Workout, 'id'>) {
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workouts: [workout] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Add failed')
    fetchWorkouts()
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

  async function sendMessage(userMessage: string, personaOverride?: PersonaKey) {
    if (!userMessage.trim() || streaming) return
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setStreaming(true)

    let assistantContent = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: SESSION_ID, personaKey: personaOverride ?? persona }),
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

  function handleChat(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    sendMessage(msg)
  }

  const WORKOUT_PRESETS = [
    { label: 'Push Day', prompt: 'Generate a push day workout (chest, shoulders, triceps)' },
    { label: 'Pull Day', prompt: 'Generate a pull day workout (back, biceps)' },
    { label: 'Leg Day', prompt: 'Generate a leg day workout (quads, hamstrings, glutes)' },
    { label: 'Full Body', prompt: 'Generate a full body workout' },
    { label: 'Upper Body', prompt: 'Generate an upper body workout' },
    { label: 'Lower Body', prompt: 'Generate a lower body workout' },
  ]

  async function handleGenerate(prompt: string) {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setGenerateError(null)
    setGeneratedWorkouts([])
    setSaveResult(null)
    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, personaKey: persona }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGeneratedWorkouts(data)
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveGenerated() {
    if (generatedWorkouts.length === 0) return
    setSaveResult(null)
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workouts: generatedWorkouts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveResult({ success: true, count: data.count })
    } catch (e: unknown) {
      setSaveResult({ error: e instanceof Error ? e.message : 'Save failed' })
    }
  }

  const sendChatFromVideo = useCallback(() => {
    if (!videoStats || videoStats.repCount === 0) return
    const exerciseName = EXERCISE_LABELS[videoExercise]
    const msg = `I just did ${videoStats.repCount} reps of ${exerciseName}. Detection confidence: ${Math.round(videoStats.confidence * 100)}%. Can you analyze my set and give me coaching tips?`
    setPersona('movement')
    setTab('chat')
    // Small delay to let tab switch render before sending
    setTimeout(() => sendMessage(msg, 'movement'), 100)
  }, [videoStats, videoExercise, streaming])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">WorkoutCoach</h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-8 bg-zinc-900 rounded-lg p-1 w-fit">
          {(['upload', 'workouts', 'generate', 'chat', 'video'] as const).map((t) => (
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
            <AddExerciseForm onAdd={handleAddWorkout} />
            {workouts.length > 0 && (
              <WorkoutCards
                workouts={workouts}
                expandedExercise={expandedExercise}
                onToggleExercise={(key) => setExpandedExercise(expandedExercise === key ? null : key)}
                editable
                onUpdate={handleUpdateWorkout}
                onDelete={handleDeleteWorkout}
                onAdd={handleAddWorkout}
              />
            )}
          </div>
        )}

        {tab === 'generate' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Generate Workout</h2>
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
            <p className="text-sm text-zinc-400">
              Pick a preset or describe your ideal workout. Your coach will generate a plan based on your training history.
            </p>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleGenerate(preset.prompt)}
                  disabled={generating}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleGenerate(generatePrompt) }}
              className="flex gap-3"
            >
              <input
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="Describe a workout (e.g., heavy bench day with accessories)"
                disabled={generating}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!generatePrompt.trim() || generating}
                className="px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </form>
            {generating && <p className="text-zinc-400 text-sm">Generating your workout plan...</p>}
            {generateError && (
              <div className="rounded-lg px-4 py-3 text-sm bg-red-950 border border-red-800 text-red-300">
                Error: {generateError}
              </div>
            )}
            {generatedWorkouts.length > 0 && (
              <>
                <WorkoutCards
                  workouts={generatedWorkouts}
                  expandedExercise={expandedGenExercise}
                  onToggleExercise={(key) => setExpandedGenExercise(expandedGenExercise === key ? null : key)}
                />
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSaveGenerated}
                    disabled={saveResult?.success === true}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saveResult?.success ? 'Saved!' : 'Mark as Completed'}
                  </button>
                  <button
                    onClick={() => { setGeneratedWorkouts([]); setSaveResult(null) }}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {saveResult && (
                  <div className={`rounded-lg px-4 py-3 text-sm ${saveResult.error ? 'bg-red-950 border border-red-800 text-red-300' : 'bg-green-950 border border-green-800 text-green-300'}`}>
                    {saveResult.error ? `Error: ${saveResult.error}` : `Saved ${saveResult.count} set${saveResult.count !== 1 ? 's' : ''} to your workout log`}
                  </div>
                )}
              </>
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
                        ? <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
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

        {/* Video tab — kept mounted but hidden to preserve camera state */}
        <div style={{ display: tab === 'video' ? 'block' : 'none' }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Video Coach</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="exercise-select" className="text-sm text-zinc-400">Exercise</label>
                <select
                  id="exercise-select"
                  value={videoExercise}
                  onChange={(e) => setVideoExercise(e.target.value as ExerciseKey)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none"
                >
                  {EXERCISES.map((ex) => (
                    <option key={ex} value={ex}>{EXERCISE_LABELS[ex]}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              Track your reps in real-time using your webcam. Start the camera, begin tracking, and get AI coaching feedback.
            </p>
            <VideoTracker exercise={videoExercise} onStatsUpdate={setVideoStats} />
            {videoStats && videoStats.repCount > 0 && (
              <StatsOverlay stats={videoStats} onRequestCoaching={sendChatFromVideo} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
