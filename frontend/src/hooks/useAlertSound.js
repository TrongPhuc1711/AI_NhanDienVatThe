/**
 * useAlertSound — Phát tiếng bíp cảnh báo dùng Web Audio API
 * Không cần file âm thanh ngoài, hoạt động hoàn toàn trong trình duyệt.
 */
import { useRef, useCallback } from 'react'

/**
 * Tạo một tiếng bíp đơn
 * @param {AudioContext} ctx
 * @param {object} opts
 *   frequency  - tần số Hz (440 = La chuẩn)
 *   duration   - thời lượng giây
 *   volume     - 0.0 → 1.0
 *   type       - 'sine' | 'square' | 'sawtooth' | 'triangle'
 *   startAt    - thời điểm bắt đầu (ctx.currentTime + offset)
 */
function scheduleBeep(ctx, { frequency = 880, duration = 0.12, volume = 0.4, type = 'sine', startAt = 0 }) {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type            = type
    osc.frequency.value = frequency

    // Envelope: fade-in cực ngắn → sustain → fade-out để tránh click noise
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01)
    gain.gain.setValueAtTime(volume, startAt + duration - 0.03)
    gain.gain.linearRampToValueAtTime(0, startAt + duration)

    osc.start(startAt)
    osc.stop(startAt + duration)
}

export function useAlertSound() {
    const ctxRef = useRef(null)

    /** Khởi tạo / lấy AudioContext (lazy, cần gesture của user) */
    const getCtx = useCallback(() => {
        if (!ctxRef.current || ctxRef.current.state === 'closed') {
            ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        if (ctxRef.current.state === 'suspended') {
            ctxRef.current.resume()
        }
        return ctxRef.current
    }, [])

   
    const playPhoneAlert = useCallback(() => {
        const ctx = getCtx()
        const t   = ctx.currentTime
        scheduleBeep(ctx, { frequency: 1050, duration: 0.13, volume: 0.5, type: 'square', startAt: t })
        scheduleBeep(ctx, { frequency: 1050, duration: 0.13, volume: 0.5, type: 'square', startAt: t + 0.20 })
    }, [getCtx])

    
    const playDrowsyWarning = useCallback(() => {
        const ctx = getCtx()
        const t   = ctx.currentTime
        scheduleBeep(ctx, { frequency: 660, duration: 0.35, volume: 0.45, type: 'sine', startAt: t })
    }, [getCtx])

    
    const playDrowsyDanger = useCallback(() => {
        const ctx = getCtx()
        const t   = ctx.currentTime
        ;[0, 0.22, 0.44].forEach(offset => {
            scheduleBeep(ctx, { frequency: 980, duration: 0.18, volume: 0.6, type: 'sawtooth', startAt: t + offset })
        })
    }, [getCtx])

    return { playPhoneAlert, playDrowsyWarning, playDrowsyDanger }
}