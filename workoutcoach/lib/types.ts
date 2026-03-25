export interface Workout {
  id?: string
  date: string
  exercise: string
  weight: number
  reps: number
  sets: number
  rpe: number
  notes?: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  sessionId: string
}

export interface ChatResponse {
  chunk?: string
  done?: boolean
  error?: string
}

export interface UploadResponse {
  success?: boolean
  count?: number
  error?: string
}
