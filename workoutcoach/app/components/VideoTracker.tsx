'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { VideoStats, VideoTrackerProps } from '@/lib/videoTypes'

// COCO skeleton connections for drawing lines between keypoints
const SKELETON: [number, number][] = [
  [5, 6],   // shoulders
  [5, 7],   // left shoulder → left elbow
  [7, 9],   // left elbow → left wrist
  [6, 8],   // right shoulder → right elbow
  [8, 10],  // right elbow → right wrist
  [5, 11],  // left shoulder → left hip
  [6, 12],  // right shoulder → right hip
  [11, 12], // hips
  [11, 13], // left hip → left knee
  [13, 15], // left knee → left ankle
  [12, 14], // right hip → right knee
  [14, 16], // right knee → right ankle
]

const KEYPOINT_COLOR = '#22c55e'  // green-500
const SKELETON_COLOR = '#4ade80'  // green-400
const LOW_CONF_COLOR = '#71717a'  // zinc-500

const WS_URL = process.env.NEXT_PUBLIC_INFERENCE_WS_URL || 'ws://localhost:8000/ws/track'
const FRAME_INTERVAL_MS = 100 // 10 fps

export default function VideoTracker({ onStatsUpdate }: VideoTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waitingForResponse = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const [isTracking, setIsTracking] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestStats, setLatestStats] = useState<VideoStats | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.')
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)

    ws.onmessage = (event) => {
      waitingForResponse.current = false
      try {
        const data = JSON.parse(event.data) as VideoStats
        if ('error' in data) return
        setLatestStats(data)
        onStatsUpdate(data)
        drawOverlay(data.keypoints)
      } catch {
        // skip malformed messages
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      waitingForResponse.current = false
    }

    ws.onerror = () => {
      setWsConnected(false)
      setError('Inference server offline. Start the Python sidecar on port 8000.')
    }
  }, [onStatsUpdate])

  const drawOverlay = useCallback((keypoints: [number, number, number][]) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    if (!keypoints || keypoints.length === 0) return

    // Scale factors (keypoints are in original frame coordinates)
    const scaleX = canvas.width / (video.videoWidth || 640)
    const scaleY = canvas.height / (video.videoHeight || 480)

    // Draw skeleton lines
    ctx.lineWidth = 2
    for (const [i, j] of SKELETON) {
      if (i >= keypoints.length || j >= keypoints.length) continue
      const [x1, y1, c1] = keypoints[i]
      const [x2, y2, c2] = keypoints[j]
      if (c1 < 0.3 || c2 < 0.3) continue

      ctx.strokeStyle = c1 > 0.5 && c2 > 0.5 ? SKELETON_COLOR : LOW_CONF_COLOR
      ctx.beginPath()
      ctx.moveTo(x1 * scaleX, y1 * scaleY)
      ctx.lineTo(x2 * scaleX, y2 * scaleY)
      ctx.stroke()
    }

    // Draw keypoints
    for (const [x, y, conf] of keypoints) {
      if (conf < 0.3) continue
      ctx.fillStyle = conf > 0.5 ? KEYPOINT_COLOR : LOW_CONF_COLOR
      ctx.beginPath()
      ctx.arc(x * scaleX, y * scaleY, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const sendFrame = useCallback(() => {
    if (waitingForResponse.current) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (!videoRef.current || videoRef.current.readyState < 2) return

    // Draw to offscreen canvas and send as JPEG blob
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas')
    }
    const offscreen = offscreenRef.current
    offscreen.width = videoRef.current.videoWidth || 640
    offscreen.height = videoRef.current.videoHeight || 480
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    ctx.drawImage(videoRef.current, 0, 0, offscreen.width, offscreen.height)
    offscreen.toBlob(
      (blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          waitingForResponse.current = true
          wsRef.current.send(blob)
        }
      },
      'image/jpeg',
      0.6,
    )
  }, [])

  const startTracking = useCallback(async () => {
    setError(null)
    if (!cameraReady) await startCamera()
    connectWebSocket()
    setIsTracking(true)

    intervalRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS)
  }, [cameraReady, startCamera, connectWebSocket, sendFrame])

  const stopTracking = useCallback(() => {
    setIsTracking(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setWsConnected(false)
    waitingForResponse.current = false
  }, [])

  const stopCamera = useCallback(() => {
    stopTracking()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
    setLatestStats(null)
    // Clear the canvas
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [stopTracking])

  // Draw plain video when not getting inference results
  useEffect(() => {
    if (!cameraReady || isTracking) return
    let animId: number
    const drawPlain = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (canvas && video) {
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      }
      animId = requestAnimationFrame(drawPlain)
    }
    drawPlain()
    return () => cancelAnimationFrame(animId)
  }, [cameraReady, isTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (wsRef.current) wsRef.current.close()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Video / Canvas */}
      <div className="relative bg-zinc-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-500 text-sm">Camera not started</p>
          </div>
        )}

        {/* Connection indicator */}
        {isTracking && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        )}

        {/* Live stats badge */}
        {isTracking && latestStats && latestStats.exercise !== 'unknown' && (
          <div className="absolute top-3 right-3 bg-black/60 rounded-lg px-3 py-2 text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wide">{latestStats.exercise}</p>
            <p className="text-2xl font-bold text-white">{latestStats.repCount} <span className="text-sm font-normal text-zinc-400">reps</span></p>
            <p className="text-xs text-zinc-400 capitalize">{latestStats.phase}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!cameraReady ? (
          <button
            onClick={startCamera}
            className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Start Camera
          </button>
        ) : !isTracking ? (
          <>
            <button
              onClick={startTracking}
              className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
            >
              Start Tracking
            </button>
            <button
              onClick={stopCamera}
              className="px-5 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
            >
              Stop Camera
            </button>
          </>
        ) : (
          <>
            <button
              onClick={stopTracking}
              className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 transition-colors"
            >
              Stop Tracking
            </button>
            <button
              onClick={stopCamera}
              className="px-5 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 transition-colors"
            >
              Stop Camera
            </button>
          </>
        )}

        {isTracking && !wsConnected && (
          <span className="text-xs text-yellow-400">Connecting to inference server...</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-950 border border-red-800 text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
