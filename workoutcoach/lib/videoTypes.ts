export const EXERCISES = ['squat', 'bicep_curl', 'overhead_press', 'lateral_raise'] as const
export type ExerciseKey = (typeof EXERCISES)[number]

export const EXERCISE_LABELS: Record<ExerciseKey, string> = {
  squat: 'Squat',
  bicep_curl: 'Bicep Curl',
  overhead_press: 'Overhead Press',
  lateral_raise: 'Lateral Raise',
}

export interface VideoStats {
  keypoints: [number, number, number][] // [x, y, confidence] for 17 COCO keypoints
  exercise: string
  repCount: number
  phase: 'up' | 'down' | 'idle'
  confidence: number
}

export interface VideoTrackerProps {
  exercise: ExerciseKey
  onStatsUpdate: (stats: VideoStats) => void
}

export interface StatsOverlayProps {
  stats: VideoStats
  onRequestCoaching: () => void
}
