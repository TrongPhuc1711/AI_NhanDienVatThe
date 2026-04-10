/**
 * App.jsx — Ứng dụng chính với 2 chế độ:
 *   1. 🎯 Object Detection (YOLOv8)
 *   2. 😴 Drowsiness Detection (MediaPipe)
 */
import React, { useState } from 'react'
import { Play, Square } from 'lucide-react'

// ── Object Detection ──
import CameraView  from './component/CameraView'
import StatsPanel  from './component/StatsPanel'
import HistoryChart from './component/HistoryChart'
import AlertLog    from './component/AlertLog'
import ControlBar  from './component/ControlBar'
import { useDetection } from './hooks/useDetection'

// ── Drowsiness Detection ──
import DrowsinessPanel from './component/DrowsinessPanel'
import { useDrowsiness } from './hooks/useDrowsiness'

// ════════════════════════════════════════════════
// Sub-app: Object Detection
// ════════════════════════════════════════════════
function ObjectDetectionApp() {
    const {
        videoRef, canvasRef,
        isRunning, detections, counts,
        phoneAlert, processingMs, fps,
        error, isConnected,
        targetFps, setTargetFps,
        confidence, setConfidence,
        startCamera, stopCamera,
    } = useDetection()

    return (
        <>
            {error && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
                    <span>⚠️</span> {error}
                </div>
            )}

            <main className="flex-1 p-5 flex gap-5 min-h-0 max-w-screen-xl mx-auto w-full">
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    <CameraView videoRef={videoRef} canvasRef={canvasRef}
                        isRunning={isRunning} phoneAlert={phoneAlert} />
                    <ControlBar
                        targetFps={targetFps} onFpsChange={setTargetFps}
                        confidence={confidence} onConfidenceChange={setConfidence} />
                    <HistoryChart counts={counts} />
                    <AlertLog phoneAlert={phoneAlert} />
                </div>

                <aside className="w-72 shrink-0 flex flex-col">
                    <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
                        📊 THỐNG KÊ REALTIME
                    </p>
                    <div className="flex-1">
                        <StatsPanel
                            counts={counts} detections={detections}
                            processingMs={processingMs} fps={fps}
                            isConnected={isConnected} phoneAlert={phoneAlert} />
                    </div>
                </aside>
            </main>

            {/* Controls đặt ở footer của mode này */}
            <div className="shrink-0 px-6 pb-4 flex justify-center">
                <StartStopButton isRunning={isRunning}
                    onStart={startCamera} onStop={stopCamera} />
            </div>
        </>
    )
}

// ════════════════════════════════════════════════
// Sub-app: Drowsiness Detection
// ════════════════════════════════════════════════
function DrowsinessApp() {
    const {
        videoRef, canvasRef,
        isRunning, isConnected, error, fps,
        drowsyData, eyesAlert, headAlert, drowsyAlert,
        startCamera, stopCamera,
    } = useDrowsiness()

    const level = drowsyData.drowsy_level

    return (
        <>
            {error && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/10 text-red-300 text-sm flex items-center gap-2">
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* Alert toàn màn hình khi buồn ngủ nặng */}
            {drowsyAlert && level >= 2 && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-red-500 bg-red-500/20 text-red-200
                    text-sm font-bold flex items-center gap-2 animate-pulse shrink-0">
                    🚨 CẢNH BÁO NGUY HIỂM! Bạn đang buồn ngủ — hãy dừng lại nghỉ ngơi!
                </div>
            )}

            <main className="flex-1 p-5 flex gap-5 min-h-0 max-w-screen-xl mx-auto w-full">

                {/* Camera */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    {/* Camera view tái sử dụng — truyền drowsyAlert thay phoneAlert */}
                    <div
                        className={`relative w-full aspect-video rounded-xl overflow-hidden border-2
                            transition-all duration-300 scan-overlay
                            ${level === 2 ? 'border-red-500'
                                : level === 1 ? 'border-yellow-400'
                                : isRunning   ? 'border-green-400 glow-green'
                                :               'border-slate-700'}`}
                        style={{ background: '#000' }}
                    >
                        {['tl','tr','bl','br'].map(pos => (
                            <div key={pos} className={`corner-bracket ${pos}`}
                                style={{ borderColor: level > 0 ? '#FF4444' : 'var(--accent-green)' }} />
                        ))}

                        <video ref={videoRef}
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                            muted playsInline />

                        <canvas ref={canvasRef}
                            className="absolute inset-0 w-full h-full" />

                        {!isRunning && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="text-6xl opacity-30">😴</div>
                                <p className="text-slate-500 font-mono text-sm">
                                    Nhấn START để bắt đầu theo dõi
                                </p>
                            </div>
                        )}

                        {isRunning && (
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-fast" />
                                <span className="text-green-400 font-mono text-xs font-bold">LIVE</span>
                            </div>
                        )}

                        {/* FPS + level badge */}
                        {isRunning && (
                            <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1
                                font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                                {fps} FPS
                            </div>
                        )}
                    </div>

                    {/* Hướng dẫn sử dụng */}
                    <div className="rounded-xl border p-4"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                        <p className="text-xs font-mono font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
                            📖 HƯỚNG DẪN
                        </p>
                        <ul className="text-xs font-mono space-y-1" style={{ color: 'var(--text-muted)' }}>
                            <li>• Giữ khuôn mặt hướng về camera</li>
                            <li>• Ánh sáng đủ để nhận diện mặt</li>
                            <li>• Cảnh báo khi mắt nhắm &gt; 2 giây</li>
                            <li>• Cảnh báo khi đầu cúi &gt; 1.5 giây</li>
                        </ul>
                    </div>

                    <StartStopButton isRunning={isRunning}
                        onStart={startCamera} onStop={stopCamera} />
                </div>

                {/* Stats */}
                <aside className="w-72 shrink-0 flex flex-col">
                    <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
                        😴 DROWSINESS MONITOR
                    </p>
                    <div className="flex-1 overflow-y-auto">
                        <DrowsinessPanel
                            drowsyData={drowsyData}
                            eyesAlert={eyesAlert}
                            headAlert={headAlert}
                            drowsyAlert={drowsyAlert}
                            fps={fps}
                            isConnected={isConnected} />
                    </div>
                </aside>
            </main>
        </>
    )
}

// ════════════════════════════════════════════════
// Root App
// ════════════════════════════════════════════════
export default function App() {
    const [mode, setMode] = useState('detection') // 'detection' | 'drowsiness'

    return (
        <div className="min-h-screen flex flex-col grid-bg" style={{ background: 'var(--bg-primary)' }}>

            {/* ══ HEADER ══ */}
            <header className="shrink-0 border-b px-6 py-3 flex items-center justify-between"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{ background: 'var(--accent-blue)', boxShadow: '0 0 16px #4488FF55' }}>
                        {mode === 'drowsiness' ? '😴' : '🎯'}
                    </div>
                    <div>
                        <h1 className="font-bold leading-none" style={{ fontFamily: 'Space Grotesk', fontSize: 17 }}>
                            {mode === 'drowsiness' ? 'Drowsiness Detector' : 'YOLOv8 Detector'}
                        </h1>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                            {mode === 'drowsiness' ? 'MediaPipe Face Mesh' : 'Realtime Object Detection'}
                        </p>
                    </div>
                </div>

                {/* Mode switcher */}
                <div className="flex items-center gap-2 p-1 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    <ModeBtn
                        active={mode === 'detection'}
                        onClick={() => setMode('detection')}
                        label="🎯 Object Detection" />
                    <ModeBtn
                        active={mode === 'drowsiness'}
                        onClick={() => setMode('drowsiness')}
                        label="😴 Drowsiness" />
                </div>
            </header>

            {/* ══ CONTENT ══ */}
            <div className="flex-1 flex flex-col min-h-0">
                {mode === 'detection'
                    ? <ObjectDetectionApp />
                    : <DrowsinessApp />}
            </div>

            {/* ══ FOOTER ══ */}
            <footer className="shrink-0 border-t px-6 py-2.5 flex items-center justify-between text-xs font-mono"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <span>YOLOv8n · MediaPipe · FastAPI · React</span>
                <span>Built for learning 🎓</span>
            </footer>
        </div>
    )
}

// ── Shared components ────────────────────────────

function ModeBtn({ active, onClick, label }) {
    return (
        <button onClick={onClick}
            className="px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all"
            style={active
                ? { background: 'var(--accent-blue)', color: '#000' }
                : { color: 'var(--text-muted)' }}>
            {label}
        </button>
    )
}

function StartStopButton({ isRunning, onStart, onStop }) {
    return (
        <button
            onClick={isRunning ? onStop : onStart}
            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm
                transition-all duration-150 active:scale-95
                ${isRunning ? 'bg-red-500 hover:bg-red-400 text-white' : 'text-black hover:opacity-90'}`}
            style={!isRunning ? { background: 'var(--accent-green)' } : {}}>
            {isRunning
                ? <><Square size={13} fill="currentColor" /> DỪNG</>
                : <><Play  size={13} fill="currentColor" /> BẮT ĐẦU</>}
        </button>
    )
}