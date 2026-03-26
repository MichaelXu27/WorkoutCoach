export interface VideoStats {
  keypoints: [number, number, number][] // [x, y, confidence] for 17 COCO keypoints
  exercise: string
  repCount: number
  phase: 'up' | 'down' | 'idle'
  confidence: number
}

export interface VideoTrackerProps {
  onStatsUpdate: (stats: VideoStats) => void
}

export interface StatsOverlayProps {
  stats: VideoStats
  onRequestCoaching: () => void
}
