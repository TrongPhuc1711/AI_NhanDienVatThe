/**
 * DrowsinessPanel — Hiển thị thống kê phát hiện buồn ngủ
 */
import React from 'react'
import { Eye, EyeOff, AlertTriangle, Activity, Wifi, WifiOff } from 'lucide-react'

export default function DrowsinessPanel({
    drowsyData, eyesAlert, headAlert, drowsyAlert,
    fps, isConnected,
}) {
    const {
        face_detected,
        avg_ear, left_ear, right_ear,
        eyes_closed, head_pitch, head_nodding,
        drowsy_level, processing_time_ms,
    } = drowsyData

    const levelColors = {
        0: { text: '#00FF88', bg: '#00FF8811', border: '#00FF8844', label: 'BÌNH THƯỜNG' },
        1: { text: '#FF8800', bg: '#FF880011', border: '#FF880044', label: 'CẢNH BÁO'   },
        2: { text: '#FF2200', bg: '#FF220022', border: '#FF220066', label: 'NGUY HIỂM!' },
    }
    const lc = levelColors[drowsy_level] || levelColors[0]

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* Kết nối */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono
                ${isConnected
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : 'border-red-500/40  bg-red-500/10  text-red-400'}`}>
                {isConnected
                    ? <><Wifi size={14} /> Backend: Kết nối</>
                    : <><WifiOff size={14} /> Backend: Mất kết nối</>}
            </div>

            {/* Trạng thái tổng hợp */}
            <div
                className="rounded-xl border p-4 text-center transition-all"
                style={{ borderColor: lc.border, background: lc.bg }}
            >
                <div className="text-3xl mb-1">
                    {drowsy_level === 0 ? '😊' : drowsy_level === 1 ? '😴' : '🚨'}
                </div>
                <div className="font-bold text-lg" style={{ color: lc.text, fontFamily: 'Space Grotesk' }}>
                    {lc.label}
                </div>
                {!face_detected && (
                    <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                        Không phát hiện khuôn mặt
                    </div>
                )}
            </div>

            {/* Số liệu nhanh */}
            <div className="grid grid-cols-2 gap-3">
                <MiniCard icon={<Activity size={16} />} label="FPS" value={fps} color="#4488FF" />
                <MiniCard icon="⏱" label="Latency" value={`${processing_time_ms}ms`} color="#9B59B6" />
            </div>

            {/* EAR Gauge */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
                    👁 EYE ASPECT RATIO
                </p>

                <EarBar label="Trái" value={left_ear}  closed={eyes_closed} />
                <EarBar label="Phải" value={right_ear} closed={eyes_closed} />

                <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        Trung bình
                    </span>
                    <span
                        className="font-bold font-mono text-sm"
                        style={{ color: eyes_closed ? '#FF4444' : '#00FF88' }}
                    >
                        {avg_ear.toFixed(3)}
                    </span>
                </div>

                {/* Trạng thái mắt */}
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono
                    ${eyes_closed
                        ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
                    {eyes_closed
                        ? <><EyeOff size={13} /> Mắt đang nhắm (EAR &lt; 0.22)</>
                        : <><Eye size={13} /> Mắt mở bình thường</>}
                </div>

                {eyesAlert && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold
                        bg-red-600/25 border border-red-500 text-red-300 animate-pulse">
                        ⚠️ Mắt nhắm quá 2 giây!
                    </div>
                )}
            </div>

            {/* Head Pose */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
                    🎯 HEAD POSE (GÓC NGHIÊNG)
                </p>

                {/* Pitch bar */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>
                        Pitch
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${Math.min(head_pitch / 30 * 100, 100)}%`,
                                background: head_nodding ? '#FF8800' : '#00FF88',
                            }}
                        />
                    </div>
                    <span className="text-xs font-mono w-12 text-right shrink-0"
                        style={{ color: head_nodding ? '#FF8800' : '#00FF88' }}>
                        {head_pitch.toFixed(1)}°
                    </span>
                </div>

                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono
                    ${head_nodding
                        ? 'bg-orange-500/15 border border-orange-500/40 text-orange-300'
                        : 'bg-green-500/10  border border-green-500/30  text-green-400'}`}>
                    {head_nodding
                        ? '😴 Đầu đang gật (pitch &gt; 15°)'
                        : '✅ Đầu thẳng bình thường'}
                </div>

                {headAlert && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold
                        bg-orange-600/25 border border-orange-500 text-orange-300 animate-pulse">
                        ⚠️ Đầu cúi quá 1.5 giây!
                    </div>
                )}
            </div>

            {/* Ngưỡng tham khảo */}
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                <p className="text-xs font-mono font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
                    📋 NGƯỠNG CẢNH BÁO
                </p>
                <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex justify-between">
                        <span>EAR mắt nhắm</span>
                        <span style={{ color: '#FF4444' }}>&lt; 0.22</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Góc gật đầu</span>
                        <span style={{ color: '#FF8800' }}>&gt; 15°</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Thời gian nhắm</span>
                        <span style={{ color: '#FF4444' }}>&gt; 2 giây</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Thời gian gật</span>
                        <span style={{ color: '#FF8800' }}>&gt; 1.5 giây</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Sub-components ────────────────────────────

function MiniCard({ icon, label, value, color }) {
    return (
        <div className="rounded-xl p-3 border text-center"
            style={{ borderColor: color + '44', background: color + '11' }}>
            <div className="flex justify-center mb-1" style={{ color }}>
                {typeof icon === 'string' ? <span>{icon}</span> : icon}
            </div>
            <div className="font-bold text-lg font-mono" style={{ color }}>
                {value}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
        </div>
    )
}

function EarBar({ label, value, closed }) {
    const pct = Math.min(value / 0.4 * 100, 100)
    const color = closed ? '#FF4444' : pct < 65 ? '#FFD700' : '#00FF88'
    return (
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono w-10 shrink-0" style={{ color: 'var(--text-muted)' }}>
                {label}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="text-xs font-mono w-12 text-right shrink-0" style={{ color }}>
                {value.toFixed(3)}
            </span>
        </div>
    )
}