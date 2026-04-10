
import React from 'react'
import { Play, Square, Zap, } from 'lucide-react'
import CameraView from './component/CameraView'
import StatsPanel from './component/StatsPanel'
import HistoryChart from './component/HistoryChart'
import AlertLog from './component/AlertLog'
import ControlBar from './component/ControlBar'
import { useDetection } from './hooks/useDetection'

export default function App() {
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
    <div className="min-h-screen flex flex-col grid-bg" style={{ background: 'var(--bg-primary)' }}>

      {/* ══ HEADER ═══════════════════════════════════════ */}
      <header
        className="shrink-0 border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--accent-blue)', boxShadow: '0 0 16px #4488FF55' }}
          >
            🎯
          </div>
          <div>
            <h1 className="font-bold leading-none" style={{ fontFamily: 'Space Grotesk', fontSize: 17 }}>
              YOLOv8 Detector
            </h1>
            <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
              Realtime Object Detection
            </p>
          </div>
        </div>

        {/* Status + Controls */}
        <div className="flex items-center gap-4">
          {/* Live stats chip */}
          {isRunning && (
            <div
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full border font-mono text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-green)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-fast inline-block" />
                {fps} FPS
              </span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--text-muted)' }}>{processingMs}ms</span>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span style={{ color: 'var(--accent-blue)' }}>{detections.length} obj</span>
            </div>
          )}

          {/* Start/Stop */}
          <button
            onClick={isRunning ? stopCamera : startCamera}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm
              transition-all duration-150 active:scale-95
              ${isRunning ? 'bg-red-500 hover:bg-red-400 text-white' : 'text-black hover:opacity-90'}
            `}
            style={!isRunning ? { background: 'var(--accent-green)' } : {}}
          >
            {isRunning
              ? <><Square size={13} fill="currentColor" /> DỪNG</>
              : <><Play  size={13} fill="currentColor" /> BẮT ĐẦU</>
            }
          </button>
        </div>
      </header>

      {/* ══ ERROR BANNER ════════════════════════════════ */}
      {error && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-red-500/50 bg-red-500/10 text-red-300 text-sm flex items-center gap-2 shrink-0">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ══ MAIN ════════════════════════════════════════ */}
      <main className="flex-1 p-5 flex gap-5 min-h-0 max-w-screen-xl mx-auto w-full">

        {/* Left — Camera + ControlBar + History */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Camera */}
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            isRunning={isRunning}
            phoneAlert={phoneAlert}
          />

          {/* Control Bar */}
          <ControlBar
            targetFps={targetFps}
            onFpsChange={setTargetFps}
            confidence={confidence}
            onConfidenceChange={setConfidence}
          />

          {/* History Chart */}
          <HistoryChart counts={counts} />

          {/* Alert Log */}
          <AlertLog phoneAlert={phoneAlert} />
        </div>

        {/* Right — Stats Panel */}
        <aside className="w-72 shrink-0 flex flex-col">
          <p className="text-xs font-mono font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
            📊 THỐNG KÊ REALTIME
          </p>
          <div className="flex-1">
            <StatsPanel
              counts={counts}
              detections={detections}
              processingMs={processingMs}
              fps={fps}
              isConnected={isConnected}
              phoneAlert={phoneAlert}
            />
          </div>
        </aside>
      </main>

      {/* ══ FOOTER ══════════════════════════════════════ */}
      <footer
        className="shrink-0 border-t px-6 py-2.5 flex items-center justify-between text-xs font-mono"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <span>YOLOv8n · FastAPI · React · OpenCV</span>
        <span>Built for learning 🎓</span>
      </footer>
    </div>
  )
}