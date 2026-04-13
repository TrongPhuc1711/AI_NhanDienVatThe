/**
 * App.jsx — Classroom Phone Detection System
 */
import React, { useState } from 'react'
import { Play, Square, BookOpen, Moon } from 'lucide-react'

import CameraView   from './component/CameraView'
import StatsPanel   from './component/StatsPanel'
import HistoryChart from './component/HistoryChart'
import AlertLog     from './component/AlertLog'
import ControlBar   from './component/ControlBar'
import { useDetection } from './hooks/useDetection'

import DrowsinessPanel from './component/DrowsinessPanel'
import { useDrowsiness } from './hooks/useDrowsiness'

// ════════════════════════════════════════════════
// Sub-app: Classroom Phone Detection
// ════════════════════════════════════════════════
function ClassroomDetectionApp() {
    const {
        videoRef, canvasRef,
        isRunning, detections, counts,
        phoneAlert, processingMs, fps,
        error, isConnected,
        targetFps, setTargetFps,
        confidence, setConfidence,
        startCamera, stopCamera,
    } = useDetection()

    const phoneCnt  = counts['cell phone'] || 0
    const personCnt = counts['person'] || 0

    return (
        <>
            {error && (
                <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl border border-red-700/50 bg-red-950/30 text-red-300 text-xs font-mono flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}

            {/* Phone alert banner */}
            {phoneAlert && (
                <div className="mx-5 mt-3 px-4 py-3 rounded-xl border border-amber-500/70 bg-amber-950/40
                    text-amber-200 text-sm font-bold flex items-center justify-between shrink-0"
                    style={{fontFamily:'Outfit,sans-serif'}}>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📱</span>
                        PHÁT HIỆN {phoneCnt} ĐIỆN THOẠI TRONG LỚP HỌC!
                    </div>
                    <span className="text-xs font-mono font-normal opacity-60">
                        {personCnt} học sinh trong khung hình
                    </span>
                </div>
            )}

            <main className="flex-1 p-5 flex gap-5 min-h-0 max-w-screen-xl mx-auto w-full">

                {/* Camera + Controls + Chart + Log */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <CameraView
                        videoRef={videoRef} canvasRef={canvasRef}
                        isRunning={isRunning} phoneAlert={phoneAlert} />

                    <ControlBar
                        targetFps={targetFps} onFpsChange={setTargetFps}
                        confidence={confidence} onConfidenceChange={setConfidence} />

                    <HistoryChart counts={counts} />
                    <AlertLog phoneAlert={phoneAlert} />
                </div>

                {/* Stats sidebar */}
                <aside className="w-72 shrink-0 flex flex-col">
                    <p className="text-xs font-mono font-bold mb-3" style={{color:'#3d7ab5'}}>
                        📊 GIÁM SÁT LỚP HỌC
                    </p>
                    <div className="flex-1 overflow-y-auto">
                        <StatsPanel
                            counts={counts} detections={detections}
                            processingMs={processingMs} fps={fps}
                            isConnected={isConnected} phoneAlert={phoneAlert} />
                    </div>
                </aside>
            </main>

            {/* Start/Stop */}
            <div className="shrink-0 px-5 pb-4 flex justify-center">
                <StartStopButton isRunning={isRunning}
                    onStart={startCamera} onStop={stopCamera} />
            </div>
        </>
    )
}

// ════════════════════════════════════════════════
// Sub-app: Drowsiness Detection (unchanged logic)
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
                <div className="mx-5 mt-3 px-4 py-2.5 rounded-xl border border-red-700/50 bg-red-950/30 text-red-300 text-xs font-mono flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}

            {drowsyAlert && level >= 2 && (
                <div className="mx-5 mt-3 px-4 py-3 rounded-xl border border-red-500 bg-red-950/40
                    text-red-200 text-sm font-bold flex items-center gap-2 animate-pulse shrink-0"
                    style={{fontFamily:'Outfit,sans-serif'}}>
                    🚨 CẢNH BÁO NGUY HIỂM! Bạn đang buồn ngủ — hãy dừng lại nghỉ ngơi!
                </div>
            )}

            <main className="flex-1 p-5 flex gap-5 min-h-0 max-w-screen-xl mx-auto w-full">
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300 scan-overlay
                        ${level === 2 ? 'border-red-500' : level === 1 ? 'border-amber-400' : isRunning ? 'border-emerald-400 glow-green' : 'border-slate-700'}`}
                        style={{background:'#000'}}>
                        {['tl','tr','bl','br'].map(pos => (
                            <div key={pos} className={`corner-bracket ${pos}`}
                                style={{borderColor: level > 0 ? '#FF4444' : '#10b981'}} />
                        ))}
                        <video ref={videoRef} className="w-full h-full object-cover"
                            style={{transform:'scaleX(-1)'}} muted playsInline />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                        {!isRunning && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="text-6xl opacity-20">😴</div>
                                <p className="text-xs font-mono" style={{color:'#2a5a80'}}>Nhấn START để bắt đầu theo dõi</p>
                            </div>
                        )}
                        {isRunning && (
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-fast" />
                                <span className="text-emerald-400 font-mono text-xs font-bold">LIVE</span>
                            </div>
                        )}
                        {isRunning && (
                            <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1 font-mono text-xs"
                                style={{color:'#3d7ab5'}}>{fps} FPS</div>
                        )}
                    </div>

                    <div className="rounded-xl border p-4" style={{borderColor:'#1e3a5f', background:'#071428'}}>
                        <p className="text-xs font-mono mb-2" style={{color:'#3d7ab5'}}>📖 HƯỚNG DẪN</p>
                        <ul className="text-xs font-mono space-y-1" style={{color:'#2a5a80'}}>
                            <li>• Giữ khuôn mặt hướng về camera</li>
                            <li>• Ánh sáng đủ để nhận diện mặt</li>
                            <li>• Cảnh báo khi mắt nhắm &gt; 2 giây</li>
                            <li>• Cảnh báo khi đầu cúi &gt; 1.5 giây</li>
                        </ul>
                    </div>

                    <StartStopButton isRunning={isRunning} onStart={startCamera} onStop={stopCamera} />
                </div>

                <aside className="w-72 shrink-0 flex flex-col">
                    <p className="text-xs font-mono font-bold mb-3" style={{color:'#3d7ab5'}}>
                        😴 DROWSINESS MONITOR
                    </p>
                    <div className="flex-1 overflow-y-auto">
                        <DrowsinessPanel
                            drowsyData={drowsyData} eyesAlert={eyesAlert}
                            headAlert={headAlert} drowsyAlert={drowsyAlert}
                            fps={fps} isConnected={isConnected} />
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
    const [mode, setMode] = useState('detection')
    const now = new Date()
    const timeStr = now.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})
    const dateStr = now.toLocaleDateString('vi-VN', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'})

    return (
        <div className="min-h-screen flex flex-col" style={{background:'var(--bg-primary)'}}>

            {/* ══ HEADER ══ */}
            <header className="shrink-0 border-b px-5 py-0 flex items-stretch justify-between"
                style={{borderColor:'#0d2544', background:'#04101f'}}>

                {/* Brand */}
                <div className="flex items-center gap-4 py-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{background:'linear-gradient(135deg,#0f3460,#1a5c99)', border:'1px solid #1e4a8a'}}>
                            <BookOpen size={18} style={{color:'#4a9eff'}} />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                            style={{background:'#071428', borderColor:'#071428'}}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h1 className="font-bold leading-none tracking-tight text-base"
                            style={{fontFamily:'Outfit,sans-serif', color:'#c8dff0'}}>
                            SmartClass Monitor
                        </h1>
                        <p className="text-xs mt-0.5 font-mono" style={{color:'#2a5a80'}}>
                            Hệ thống giám sát lớp học thông minh
                        </p>
                    </div>
                </div>

                {/* Center info */}
                <div className="hidden md:flex items-center gap-6 px-6 border-l border-r"
                    style={{borderColor:'#0d2544'}}>
                    <div className="text-center">
                        <div className="text-xs font-mono" style={{color:'#2a5a80'}}>PHIÊN HỌC</div>
                        <div className="text-sm font-bold font-mono" style={{color:'#4a9eff'}}>{timeStr}</div>
                    </div>
                    <div className="w-px h-8" style={{background:'#0d2544'}} />
                    <div className="text-center">
                        <div className="text-xs font-mono" style={{color:'#2a5a80'}}>NGÀY</div>
                        <div className="text-xs font-mono" style={{color:'#c8dff0'}}>{dateStr}</div>
                    </div>
                    <div className="w-px h-8" style={{background:'#0d2544'}} />
                    <div className="text-center">
                        <div className="text-xs font-mono" style={{color:'#2a5a80'}}>MODEL</div>
                        <div className="text-xs font-mono" style={{color:'#c8dff0'}}>YOLOv8n · MediaPipe</div>
                    </div>
                </div>

                {/* Mode switcher */}
                <div className="flex items-center gap-2 py-3">
                    <div className="flex items-center gap-1 p-1 rounded-xl border"
                        style={{borderColor:'#1e3a5f', background:'#071428'}}>
                        <ModeBtn
                            active={mode === 'detection'}
                            onClick={() => setMode('detection')}
                            icon="📱"
                            label="Điện thoại" />
                        <ModeBtn
                            active={mode === 'drowsiness'}
                            onClick={() => setMode('drowsiness')}
                            icon={<Moon size={13}/>}
                            label="Buồn ngủ" />
                    </div>
                </div>
            </header>

            {/* ══ CONTENT ══ */}
            <div className="flex-1 flex flex-col min-h-0">
                {mode === 'detection'
                    ? <ClassroomDetectionApp />
                    : <DrowsinessApp />}
            </div>

            {/* ══ FOOTER ══ */}
            <footer className="shrink-0 border-t px-5 py-2 flex items-center justify-between text-xs font-mono"
                style={{borderColor:'#0d2544', color:'#1e3a5f', background:'#04101f'}}>
                <span>YOLOv8n · MediaPipe Face Mesh · FastAPI · React + Vite</span>
                <span style={{color:'#2a5a80'}}>SmartClass Monitor v2.0</span>
            </footer>
        </div>
    )
}

// ── Shared components ─────────────────────────

function ModeBtn({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-200"
            style={active
                ? {background:'linear-gradient(135deg,#0f3460,#1a5c99)', color:'#7ec8ff', border:'1px solid #1e4a8a'}
                : {color:'#2a5a80', border:'1px solid transparent'}}>
            <span>{icon}</span>
            {label}
        </button>
    )
}

function StartStopButton({ isRunning, onStart, onStop }) {
    return (
        <button
            onClick={isRunning ? onStop : onStart}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm
                transition-all duration-150 active:scale-95 border"
            style={isRunning
                ? {background:'#1c0505', borderColor:'#7f1d1d', color:'#fca5a5'}
                : {background:'linear-gradient(135deg,#0f3460,#1e5fa0)', borderColor:'#2563eb', color:'#bfdbfe', fontFamily:'Outfit,sans-serif'}
            }>
            {isRunning
                ? <><Square size={13} fill="currentColor"/> DỪNG GIÁM SÁT</>
                : <><Play size={13} fill="currentColor"/> BẮT ĐẦU GIÁM SÁT</>}
        </button>
    )
}