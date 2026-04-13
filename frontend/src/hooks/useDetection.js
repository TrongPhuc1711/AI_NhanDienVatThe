import { useState, useRef, useCallback, useEffect, useReducer } from 'react'

const API_BASE = 'http://localhost:8000'

// ── Gộp toàn bộ detection state vào 1 object ──────────────────
// → Chỉ trigger 1 re-render duy nhất mỗi lần cập nhật UI
const INIT_STATE = {
    detections:  [],
    counts:      {},
    phoneAlert:  false,
    processingMs: 0,
    isConnected: false,
}

function detectionReducer(state, action) {
    switch (action.type) {
        case 'UPDATE': return { ...state, ...action.payload }
        case 'RESET':  return { ...INIT_STATE, isConnected: state.isConnected }
        default:       return state
    }
}

export function useDetection() {
    // ── Settings ───────────────────────────────────────────────
    const [targetFps, setTargetFps] = useState(8)
    const [confidence, setConfidence] = useState(40)
    const [isRunning, setIsRunning] = useState(false)
    const [fps, setFps] = useState(0)
    const [error, setError] = useState(null)

    // ── Tất cả detection data trong 1 reducer → 1 re-render ───
    const [state, dispatch] = useReducer(detectionReducer, INIT_STATE)

    // ── Refs ───────────────────────────────────────────────────
    const videoRef          = useRef(null)
    const canvasRef         = useRef(null)
    const streamRef         = useRef(null)
    const intervalRef       = useRef(null)
    const fpsCountRef       = useRef(0)
    const fpsTimerRef       = useRef(null)
    const offscreenCanvasRef = useRef(document.createElement('canvas'))

    // Refs cho settings → interval đọc giá trị mới nhất, không re-create
    const targetFpsRef  = useRef(targetFps)
    const confidenceRef = useRef(confidence)
    useEffect(() => { targetFpsRef.current = targetFps  }, [targetFps])
    useEffect(() => { confidenceRef.current = confidence }, [confidence])

    // ── Throttle UI updates ────────────────────────────────────
    // Canvas vẽ mỗi frame, nhưng React state chỉ update tối đa 6 lần/giây
    // → Xóa hiện tượng component "giật" do re-render quá nhiều
    const lastUiUpdateRef = useRef(0)
    const UI_UPDATE_MS    = 160  // ~6Hz cho UI, đủ mượt mà không lag

    // ── Kiểm tra kết nối backend ───────────────────────────────
    useEffect(() => {
        const check = () =>
            fetch(`${API_BASE}/`)
                .then(r => {
                    if (r.ok !== state.isConnected)
                        dispatch({ type: 'UPDATE', payload: { isConnected: r.ok } })
                })
                .catch(() => {
                    if (state.isConnected)
                        dispatch({ type: 'UPDATE', payload: { isConnected: false } })
                })
        check()
        const t = setInterval(check, 5000)
        return () => clearInterval(t)
    }, []) // eslint-disable-line

    // ── Bắt đầu webcam ────────────────────────────────────────
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

    // ── Gửi frame ─────────────────────────────────────────────
    const sendFrame = useCallback(async () => {
        const video  = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.paused || video.ended || !video.videoWidth) return

        // Capture frame vào canvas ẩn
        const temp = offscreenCanvasRef.current
        if (temp.width !== video.videoWidth) {
            temp.width  = video.videoWidth
            temp.height = video.videoHeight
        }
        const ctx = temp.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, temp.width, temp.height)
        const base64 = temp.toDataURL('image/jpeg', 0.7)

        try {
            const res = await fetch(`${API_BASE}/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image:      base64,
                    confidence: confidenceRef.current / 100,
                }),
            })
            if (!res.ok) throw new Error(res.status)
            const data = await res.json()

            // ✅ Luôn vẽ canvas ngay lập tức (không phụ thuộc React)
            drawBoundingBoxes(canvas, data.detections)
            fpsCountRef.current += 1

            // ✅ Chỉ update React state khi đã đủ thời gian → không giật UI
            const now = Date.now()
            if (now - lastUiUpdateRef.current >= UI_UPDATE_MS) {
                lastUiUpdateRef.current = now
                // 1 dispatch duy nhất → 1 re-render duy nhất
                dispatch({
                    type: 'UPDATE',
                    payload: {
                        detections:   data.detections,
                        counts:       data.counts,
                        phoneAlert:   data.phone_alert,
                        processingMs: data.processing_time_ms,
                        isConnected:  true,
                    },
                })
            }
        } catch {
            dispatch({ type: 'UPDATE', payload: { isConnected: false } })
        }
    }, [])

    // ── Vòng lặp detection ────────────────────────────────────
    useEffect(() => {
        if (!isRunning) return
        let cancelled = false

        const loop = async () => {
            if (cancelled) return
            await sendFrame()
            if (!cancelled)
                intervalRef.current = setTimeout(loop, Math.round(1000 / targetFpsRef.current))
        }

        loop()
        fpsTimerRef.current = setInterval(() => {
            setFps(fpsCountRef.current)
            fpsCountRef.current = 0
        }, 1000)

        return () => {
            cancelled = true
            clearTimeout(intervalRef.current)
            clearInterval(fpsTimerRef.current)
        }
    }, [isRunning, sendFrame])

    // ── Dừng camera ───────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setIsRunning(false)
        setFps(0)
        dispatch({ type: 'RESET' })
        const canvas = canvasRef.current
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }, [])

    // ── Cleanup ───────────────────────────────────────────────
    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(intervalRef.current)
        clearInterval(fpsTimerRef.current)
    }, [])

    return {
        videoRef, canvasRef,
        isRunning,
        detections:   state.detections,
        counts:       state.counts,
        phoneAlert:   state.phoneAlert,
        processingMs: state.processingMs,
        fps,
        error,
        isConnected:  state.isConnected,
        targetFps, setTargetFps,
        confidence, setConfidence,
        startCamera, stopCamera,
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Canvas drawing — hoàn toàn tách khỏi React
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function drawBoundingBoxes(canvas, detections) {
    const ctx = canvas.getContext('2d')
    const W   = canvas.width
    const H   = canvas.height
    ctx.clearRect(0, 0, W, H)

    detections.forEach(({ bbox, label, confidence, color }) => {
        const x = (1 - bbox.x - bbox.width) * W
        const y = bbox.y * H
        const w = bbox.width  * W
        const h = bbox.height * H

        // Box
        ctx.shadowColor = color
        ctx.shadowBlur  = 10
        ctx.strokeStyle = color
        ctx.lineWidth   = 2
        ctx.strokeRect(x, y, w, h)

        // Corner accents
        const cLen = Math.min(w, h) * 0.18
        ctx.lineWidth   = 3
        ctx.shadowBlur  = 0
        ;[
            [x,   y,   cLen, 0,     0,    cLen ],
            [x+w, y,  -cLen, 0,     0,    cLen ],
            [x,   y+h, cLen, 0,     0,   -cLen ],
            [x+w, y+h,-cLen, 0,     0,   -cLen ],
        ].forEach(([px,py,dx1,dy1,dx2,dy2]) => {
            ctx.beginPath()
            ctx.moveTo(px+dx1, py+dy1)
            ctx.lineTo(px, py)
            ctx.lineTo(px+dx2, py+dy2)
            ctx.stroke()
        })

        // Label
        const text     = `${label}  ${(confidence*100).toFixed(0)}%`
        const fontSize = Math.max(11, Math.min(14, w * 0.09))
        ctx.font       = `bold ${fontSize}px "DM Mono", monospace`
        const tW       = ctx.measureText(text).width
        const pH       = fontSize + 6

        ctx.fillStyle = color + 'D0'
        ctx.fillRect(x, y - pH, tW + 14, pH)
        ctx.fillStyle = '#000'
        ctx.fillText(text, x + 7, y - 4)
    })
}