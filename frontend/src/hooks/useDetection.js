/**
 * useDetection — Custom Hook
 * Quản lý toàn bộ logic: webcam, gửi frame, nhận kết quả
 * Hỗ trợ điều chỉnh FPS và confidence threshold động
 */
import { useState, useRef, useCallback, useEffect } from 'react'

const API_BASE = 'http://localhost:8000'

export function useDetection() {
  // ── Settings State ─────────────────────────────────
  const [targetFps, setTargetFps]         = useState(8)
  const [confidence, setConfidence]       = useState(40)

  // ── Detection State ────────────────────────────────
  const [isRunning, setIsRunning]         = useState(false)
  const [detections, setDetections]       = useState([])
  const [counts, setCounts]               = useState({})
  const [phoneAlert, setPhoneAlert]       = useState(false)
  const [processingMs, setProcessingMs]   = useState(0)
  const [fps, setFps]                     = useState(0)
  const [error, setError]                 = useState(null)
  const [isConnected, setIsConnected]     = useState(false)

  // ── Refs ───────────────────────────────────────────
  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const streamRef     = useRef(null)
  const intervalRef   = useRef(null)
  const fpsCountRef   = useRef(0)
  const fpsTimerRef   = useRef(null)
  // Dùng ref cho settings để interval luôn đọc giá trị mới nhất
  const targetFpsRef  = useRef(targetFps)
  const confidenceRef = useRef(confidence)

  useEffect(() => { targetFpsRef.current = targetFps }, [targetFps])
  useEffect(() => { confidenceRef.current = confidence }, [confidence])

  // ── Khi FPS thay đổi → restart interval ───────────
  useEffect(() => {
    if (!isRunning) return
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(sendFrame, Math.round(1000 / targetFps))
  }, [targetFps, isRunning])

  // ── Kiểm tra kết nối backend ───────────────────────
  useEffect(() => {
    const check = () =>
      fetch(`${API_BASE}/`)
        .then(r => setIsConnected(r.ok))
        .catch(() => setIsConnected(false))
    check()
    const t = setInterval(check, 5000)
    return () => clearInterval(t)
  }, [])

  // ── Bắt đầu webcam ────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsRunning(true)
    } catch (err) {
      setError('Không thể truy cập camera: ' + err.message)
    }
  }, [])

  // ── Bắt đầu vòng lặp sau khi isRunning = true ─────
  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(sendFrame, Math.round(1000 / targetFpsRef.current))
    fpsTimerRef.current = setInterval(() => {
      setFps(fpsCountRef.current)
      fpsCountRef.current = 0
    }, 1000)
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(fpsTimerRef.current)
    }
  }, [isRunning])

  // ── Dừng webcam ───────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsRunning(false)
    setDetections([])
    setCounts({})
    setPhoneAlert(false)
    setFps(0)
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  // ── Gửi frame lên backend ─────────────────────────
  const sendFrame = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.paused || video.ended || !video.videoWidth) return

    // Capture frame → base64 JPEG
    const temp   = document.createElement('canvas')
    temp.width   = video.videoWidth
    temp.height  = video.videoHeight
    temp.getContext('2d').drawImage(video, 0, 0)
    const base64 = temp.toDataURL('image/jpeg', 0.7)

    try {
      const res = await fetch(`${API_BASE}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          confidence: confidenceRef.current / 100,
        }),
      })
      if (!res.ok) throw new Error(res.status)
      const data = await res.json()

      setDetections(data.detections)
      setCounts(data.counts)
      setPhoneAlert(data.phone_alert)
      setProcessingMs(data.processing_time_ms)
      setIsConnected(true)

      drawBoundingBoxes(canvas, data.detections)
      fpsCountRef.current += 1
    } catch {
      setIsConnected(false)
    }
  }, [])

  // ── Cleanup ────────────────────────────────────────
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(intervalRef.current)
    clearInterval(fpsTimerRef.current)
  }, [])

  return {
    videoRef, canvasRef,
    isRunning, detections, counts,
    phoneAlert, processingMs, fps,
    error, isConnected,
    targetFps, setTargetFps,
    confidence, setConfidence,
    startCamera, stopCamera,
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Vẽ bounding box + label lên canvas overlay
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function drawBoundingBoxes(canvas, detections) {
  const ctx = canvas.getContext('2d')
  const W   = canvas.width
  const H   = canvas.height
  ctx.clearRect(0, 0, W, H)

  detections.forEach(({ bbox, label, confidence, color }) => {
    const x = bbox.x * W
    const y = bbox.y * H
    const w = bbox.width  * W
    const h = bbox.height * H

    // Bounding box với glow
    ctx.shadowColor = color
    ctx.shadowBlur  = 12
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.strokeRect(x, y, w, h)

    // Corner accents
    const cLen = Math.min(w, h) * 0.18
    ctx.lineWidth = 3
    ctx.shadowBlur = 0
    const corners = [
      [x,   y,   cLen, 0,  0,  cLen],
      [x+w, y,  -cLen, 0,  0,  cLen],
      [x,   y+h, cLen, 0,  0, -cLen],
      [x+w, y+h,-cLen, 0,  0, -cLen],
    ]
    corners.forEach(([px, py, dx1, dy1, dx2, dy2]) => {
      ctx.beginPath()
      ctx.moveTo(px + dx1, py + dy1)
      ctx.lineTo(px, py)
      ctx.lineTo(px + dx2, py + dy2)
      ctx.stroke()
    })

    // Label background + text
    const text     = `${label}  ${(confidence * 100).toFixed(0)}%`
    const fontSize = Math.max(11, Math.min(15, w * 0.09))
    ctx.font       = `bold ${fontSize}px "JetBrains Mono", monospace`
    const tW       = ctx.measureText(text).width
    const pH       = fontSize + 6

    ctx.fillStyle = color + 'E0'
    ctx.fillRect(x, y - pH, tW + 14, pH)
    ctx.fillStyle = '#000'
    ctx.fillText(text, x + 7, y - 4)
  })
}