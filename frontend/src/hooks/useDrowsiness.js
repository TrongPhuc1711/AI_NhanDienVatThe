/**
 * useDrowsiness — Hook phát hiện buồn ngủ (tối ưu, không lag)
 */
import { useState, useRef, useCallback, useEffect, useReducer } from 'react'

const API_BASE         = 'http://localhost:8000'
const EYES_CLOSED_SECS = 2.0
const HEAD_NOD_SECS    = 1.5
const UI_UPDATE_MS     = 160   // Throttle React re-renders ~6Hz

const INIT_DROWSY = {
    face_detected: false,
    left_ear: 0, right_ear: 0, avg_ear: 0,
    eyes_closed: false,
    head_pitch: 0, head_nodding: false,
    drowsy: false, drowsy_level: 0,
    left_eye_pts: [], right_eye_pts: [],
    nose_pt: null, chin_pt: null,
    processing_time_ms: 0,
}

const INIT_STATE = {
    isConnected: false,
    drowsyData:  INIT_DROWSY,
    eyesAlert:   false,
    headAlert:   false,
    drowsyAlert: false,
}

function reducer(state, action) {
    switch (action.type) {
        case 'UPDATE': return { ...state, ...action.payload }
        case 'RESET':  return { ...INIT_STATE, isConnected: state.isConnected }
        default:       return state
    }
}

export function useDrowsiness() {
    const [isRunning, setIsRunning] = useState(false)
    const [fps,       setFps      ] = useState(0)
    const [error,     setError    ] = useState(null)
    const [uiState,   dispatch    ] = useReducer(reducer, INIT_STATE)

    const videoRef         = useRef(null)
    const canvasRef        = useRef(null)
    const streamRef        = useRef(null)
    const intervalRef      = useRef(null)
    const fpsCountRef      = useRef(0)
    const fpsTimerRef      = useRef(null)
    const offscreenRef     = useRef(document.createElement('canvas'))
    const eyesClosedSince  = useRef(null)
    const headNoddingSince = useRef(null)
    const lastUiUpdateRef  = useRef(0)
    const targetFpsRef     = useRef(6)

    // Kết nối backend
    useEffect(() => {
        const check = () =>
            fetch(`${API_BASE}/`)
                .then(r => dispatch({ type: 'UPDATE', payload: { isConnected: r.ok } }))
                .catch(() => dispatch({ type: 'UPDATE', payload: { isConnected: false } }))
        check()
        const t = setInterval(check, 5000)
        return () => clearInterval(t)
    }, [])

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

    const sendFrame = useCallback(async () => {
        const video  = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.paused || video.ended || !video.videoWidth) return

        const temp = offscreenRef.current
        if (temp.width !== video.videoWidth) {
            temp.width  = video.videoWidth
            temp.height = video.videoHeight
        }
        const ctx = temp.getContext('2d', { willReadFrequently: true })
        ctx.save()
        ctx.translate(temp.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, temp.width, temp.height)
        ctx.restore()

        const base64 = temp.toDataURL('image/jpeg', 0.7)

        try {
            const res = await fetch(`${API_BASE}/drowsiness`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, confidence: 0.4 }),
            })
            if (!res.ok) throw new Error(res.status)
            const data = await res.json()

            // ✅ Vẽ overlay ngay, không chờ React
            drawDrowsinessOverlay(canvas, data)
            fpsCountRef.current += 1

            // ✅ Tính alert timers (dùng ref, không trigger render)
            const now = Date.now()
            if (data.eyes_closed) {
                if (!eyesClosedSince.current) eyesClosedSince.current = now
            } else {
                eyesClosedSince.current = null
            }
            if (data.head_nodding) {
                if (!headNoddingSince.current) headNoddingSince.current = now
            } else {
                headNoddingSince.current = null
            }

            // ✅ Throttle: chỉ update React khi đủ thời gian
            if (now - lastUiUpdateRef.current >= UI_UPDATE_MS) {
                lastUiUpdateRef.current = now
                const eyesElapsed = eyesClosedSince.current
                    ? (now - eyesClosedSince.current) / 1000 : 0
                const headElapsed = headNoddingSince.current
                    ? (now - headNoddingSince.current) / 1000 : 0

                dispatch({
                    type: 'UPDATE',
                    payload: {
                        drowsyData:  data,
                        isConnected: true,
                        eyesAlert:   eyesElapsed  >= EYES_CLOSED_SECS,
                        headAlert:   headElapsed  >= HEAD_NOD_SECS,
                        drowsyAlert: data.drowsy_level >= 1,
                    },
                })
            }
        } catch {
            dispatch({ type: 'UPDATE', payload: { isConnected: false } })
        }
    }, [])

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

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setIsRunning(false)
        setFps(0)
        eyesClosedSince.current  = null
        headNoddingSince.current = null
        dispatch({ type: 'RESET' })
        const canvas = canvasRef.current
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }, [])

    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(intervalRef.current)
        clearInterval(fpsTimerRef.current)
    }, [])

    return {
        videoRef, canvasRef,
        isRunning, fps, error,
        isConnected: uiState.isConnected,
        drowsyData:  uiState.drowsyData,
        eyesAlert:   uiState.eyesAlert,
        headAlert:   uiState.headAlert,
        drowsyAlert: uiState.drowsyAlert,
        startCamera, stopCamera,
    }
}

// ═══════════════════════════════════════════════
// Canvas overlay — tách hoàn toàn khỏi React
// ═══════════════════════════════════════════════
function drawDrowsinessOverlay(canvas, data) {
    const ctx = canvas.getContext('2d')
    const W   = canvas.width
    const H   = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (!data.face_detected) return

    const level     = data.drowsy_level
    const eyeColor  = data.eyes_closed   ? '#FF4444' : '#10b981'
    const headColor = data.head_nodding  ? '#f59e0b' : '#10b981'

    // Eye contours
    const drawEye = (pts, color) => {
        if (!pts || pts.length < 6) return
        ctx.beginPath()
        ctx.moveTo((1 - pts[0].x) * W, pts[0].y * H)
        for (let i = 1; i < pts.length; i++)
            ctx.lineTo((1 - pts[i].x) * W, pts[i].y * H)
        ctx.closePath()
        ctx.strokeStyle = color
        ctx.lineWidth   = 2
        ctx.shadowColor = color
        ctx.shadowBlur  = 8
        ctx.stroke()
        ctx.fillStyle = color + '30'
        ctx.fill()
        ctx.shadowBlur = 0
    }
    drawEye(data.left_eye_pts,  eyeColor)
    drawEye(data.right_eye_pts, eyeColor)

    // Nose → chin line
    if (data.nose_pt && data.chin_pt) {
        const nx = (1 - data.nose_pt.x) * W
        const ny = data.nose_pt.y * H
        const cx = (1 - data.chin_pt.x) * W
        const cy = data.chin_pt.y * H
        ctx.beginPath()
        ctx.moveTo(nx, ny)
        ctx.lineTo(cx, cy)
        ctx.strokeStyle = headColor + 'AA'
        ctx.lineWidth   = 2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(nx, ny, 4, 0, Math.PI * 2)
        ctx.fillStyle = headColor
        ctx.fill()
    }

    // EAR Gauge (top-right)
    const gX   = W - 130, gY = 16, gW = 110, gH = 14
    const pct  = Math.min(data.avg_ear / 0.4, 1)
    const bClr = pct < 0.55 ? '#ef4444' : pct < 0.75 ? '#f59e0b' : '#10b981'

    ctx.fillStyle = 'rgba(0,0,0,0.60)'
    ctx.fillRect(gX - 8, gY - 14, gW + 16, gH + 28)
    ctx.fillStyle = '#0d2544'
    ctx.fillRect(gX, gY, gW, gH)
    ctx.fillStyle = bClr
    ctx.fillRect(gX, gY, gW * pct, gH)

    ctx.fillStyle = '#c8dff0'
    ctx.font      = 'bold 10px "DM Mono", monospace'
    ctx.fillText(`EAR: ${data.avg_ear.toFixed(2)}`, gX, gY - 2)
    ctx.fillText(`Pitch: ${data.head_pitch.toFixed(1)}°`, gX, gY + gH + 12)

    // Drowsy badge
    if (level > 0) {
        const colors = ['', '#f59e0b', '#ef4444']
        const labels = ['', '⚠ BUỒN NGỦ', '🚨 NGUY HIỂM!']
        ctx.fillStyle   = colors[level] + 'CC'
        const bW = 180, bH = 34, bX = (W - bW) / 2, bY = H - bH - 10
        ctx.fillRect(bX, bY, bW, bH)
        ctx.fillStyle   = '#fff'
        ctx.font        = 'bold 15px "Outfit", sans-serif'
        ctx.textAlign   = 'center'
        ctx.fillText(labels[level], W / 2, bY + 22)
        ctx.textAlign   = 'left'
    }
}