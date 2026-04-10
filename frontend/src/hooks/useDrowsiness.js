/**
 * useDrowsiness — Hook quản lý logic phát hiện buồn ngủ
 *
 * Logic cảnh báo có độ trễ:
 * - Mắt nhắm liên tục > EYES_CLOSED_SECS giây → cảnh báo
 * - Đầu gật liên tục > HEAD_NOD_SECS giây → cảnh báo
 */
import { useState, useRef, useCallback, useEffect } from 'react'

const API_BASE = 'http://localhost:8000'

// Thời gian (giây) trước khi kích hoạt cảnh báo
const EYES_CLOSED_SECS = 2.0
const HEAD_NOD_SECS    = 1.5

export function useDrowsiness() {
    // ── Camera & App state ──────────────────────────
    const [isRunning, setIsRunning]     = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError]             = useState(null)
    const [fps, setFps]                 = useState(0)

    // ── Drowsiness state ────────────────────────────
    const [drowsyData, setDrowsyData] = useState({
        face_detected: false,
        left_ear:      0,
        right_ear:     0,
        avg_ear:       0,
        eyes_closed:   false,
        head_pitch:    0,
        head_nodding:  false,
        drowsy:        false,
        drowsy_level:  0,
        left_eye_pts:  [],
        right_eye_pts: [],
        nose_pt:       null,
        chin_pt:       null,
        processing_time_ms: 0,
    })

    // Cảnh báo có độ trễ (không cảnh báo ngay khi chớp mắt)
    const [eyesAlert, setEyesAlert]   = useState(false)  // Mắt nhắm lâu
    const [headAlert, setHeadAlert]   = useState(false)  // Đầu gật lâu
    const [drowsyAlert, setDrowsyAlert] = useState(false) // Tổng hợp

    // ── Refs ────────────────────────────────────────
    const videoRef          = useRef(null)
    const canvasRef         = useRef(null)
    const streamRef         = useRef(null)
    const intervalRef       = useRef(null)
    const fpsCountRef       = useRef(0)
    const fpsTimerRef       = useRef(null)
    const offscreenRef      = useRef(document.createElement('canvas'))

    // Timers theo dõi thời gian mắt nhắm / đầu cúi liên tục
    const eyesClosedSince   = useRef(null)
    const headNoddingSince  = useRef(null)

    const targetFpsRef = useRef(6)  // 6 FPS là đủ cho drowsiness

    // ── Kết nối backend ─────────────────────────────
    useEffect(() => {
        const check = () =>
            fetch(`${API_BASE}/`)
                .then(r => setIsConnected(r.ok))
                .catch(() => setIsConnected(false))
        check()
        const t = setInterval(check, 5000)
        return () => clearInterval(t)
    }, [])

    // ── Bắt đầu camera ──────────────────────────────
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

    // ── Gửi frame lên backend ───────────────────────
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
        // Lật ngang vì video bị mirror
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

            setDrowsyData(data)
            setIsConnected(true)
            fpsCountRef.current += 1

            // ── Logic cảnh báo có độ trễ ──
            const now = Date.now()

            // Mắt nhắm
            if (data.eyes_closed) {
                if (!eyesClosedSince.current) eyesClosedSince.current = now
                const elapsed = (now - eyesClosedSince.current) / 1000
                setEyesAlert(elapsed >= EYES_CLOSED_SECS)
            } else {
                eyesClosedSince.current = null
                setEyesAlert(false)
            }

            // Đầu gật
            if (data.head_nodding) {
                if (!headNoddingSince.current) headNoddingSince.current = now
                const elapsed = (now - headNoddingSince.current) / 1000
                setHeadAlert(elapsed >= HEAD_NOD_SECS)
            } else {
                headNoddingSince.current = null
                setHeadAlert(false)
            }

            // Tổng hợp
            setDrowsyAlert(data.drowsy_level >= 1)

            // Vẽ overlay
            drawDrowsinessOverlay(canvas, data)

        } catch {
            setIsConnected(false)
        }
    }, [])

    // ── Vòng lặp detection ──────────────────────────
    useEffect(() => {
        if (!isRunning) return
        let cancelled = false

        const loop = async () => {
            if (cancelled) return
            await sendFrame()
            if (!cancelled) {
                intervalRef.current = setTimeout(loop, Math.round(1000 / targetFpsRef.current))
            }
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

    // ── Dừng camera ─────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setIsRunning(false)
        setDrowsyAlert(false)
        setEyesAlert(false)
        setHeadAlert(false)
        eyesClosedSince.current  = null
        headNoddingSince.current = null
        setFps(0)
        const canvas = canvasRef.current
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }, [])

    // ── Cleanup ─────────────────────────────────────
    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(intervalRef.current)
        clearInterval(fpsTimerRef.current)
    }, [])

    return {
        videoRef, canvasRef,
        isRunning, isConnected, error, fps,
        drowsyData,
        eyesAlert, headAlert, drowsyAlert,
        startCamera, stopCamera,
    }
}

// ═══════════════════════════════════════════════════
// Vẽ overlay: eye contours + EAR bar + status
// ═══════════════════════════════════════════════════
function drawDrowsinessOverlay(canvas, data) {
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (!data.face_detected) return

    const level    = data.drowsy_level
    const eyeColor = data.eyes_closed  ? '#FF4444' : '#00FF88'
    const headColor= data.head_nodding ? '#FF8800' : '#00FF88'

    // ── Vẽ eye contours ──
    const drawEye = (pts, color) => {
        if (!pts || pts.length < 6) return
        ctx.beginPath()
        // Lật X vì video bị mirror
        ctx.moveTo((1 - pts[0].x) * W, pts[0].y * H)
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo((1 - pts[i].x) * W, pts[i].y * H)
        }
        ctx.closePath()
        ctx.strokeStyle = color
        ctx.lineWidth   = 2
        ctx.shadowColor = color
        ctx.shadowBlur  = 8
        ctx.stroke()
        // Fill bán trong suốt
        ctx.fillStyle = color + '30'
        ctx.fill()
        ctx.shadowBlur = 0
    }

    drawEye(data.left_eye_pts,  eyeColor)
    drawEye(data.right_eye_pts, eyeColor)

    // ── Đường nối nose → chin (head tilt) ──
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

        // Dot ở nose
        ctx.beginPath()
        ctx.arc(nx, ny, 4, 0, Math.PI * 2)
        ctx.fillStyle = headColor
        ctx.fill()
    }

    // ── EAR Gauge (top-right) ──
    const gaugeX = W - 130
    const gaugeY = 16
    const gaugeW = 110
    const gaugeH = 14
    const earPct = Math.min(data.avg_ear / 0.4, 1)   // 0.4 = mắt mở hoàn toàn

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(gaugeX - 8, gaugeY - 14, gaugeW + 16, gaugeH + 28)

    ctx.fillStyle = '#1A3A5C'
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH)

    const barColor = earPct < 0.55 ? '#FF4444' : earPct < 0.75 ? '#FFD700' : '#00FF88'
    ctx.fillStyle = barColor
    ctx.fillRect(gaugeX, gaugeY, gaugeW * earPct, gaugeH)

    ctx.fillStyle = '#E8F4FF'
    ctx.font = 'bold 10px "JetBrains Mono", monospace'
    ctx.fillText(`EAR: ${data.avg_ear.toFixed(2)}`, gaugeX, gaugeY - 2)
    ctx.fillText(`Pitch: ${data.head_pitch.toFixed(1)}°`, gaugeX, gaugeY + gaugeH + 12)

    // ── Drowsy Level Badge ──
    if (level > 0) {
        const badgeColors = ['', '#FF8800', '#FF2200']
        const badgeText   = ['', '⚠ BUỒN NGỦ', '🚨 NGUY HIỂM!']

        ctx.fillStyle = badgeColors[level] + 'CC'
        const bW = 180, bH = 34, bX = (W - bW) / 2, bY = H - bH - 10
        ctx.fillRect(bX, bY, bW, bH)

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 15px "Space Grotesk", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(badgeText[level], W / 2, bY + 22)
        ctx.textAlign = 'left'
    }
}