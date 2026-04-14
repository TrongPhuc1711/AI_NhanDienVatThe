import React from 'react'
import { Settings, Gauge } from 'lucide-react'

const FPS_OPTIONS = [4, 8, 12, 16]

export default function ControlBar({ targetFps, onFpsChange, confidence, onConfidenceChange }) {
  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-wrap items-center gap-6"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-center gap-2">
        <Settings size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
          CÀI ĐẶT
        </span>
      </div>

      {/* FPS Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>FPS:</span>
        <div className="flex gap-1">
          {FPS_OPTIONS.map(fps => (
            <button
              key={fps}
              onClick={() => onFpsChange(fps)}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all
                ${targetFps === fps
                  ? 'text-black'
                  : 'hover:opacity-80'
                }
              `}
              style={targetFps === fps
                ? { background: 'var(--accent-blue)', color: '#000' }
                : { background: 'var(--border)', color: 'var(--text-muted)' }
              }
            >
              {fps}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence Threshold */}
      <div className="flex items-center gap-3 flex-1 min-w-48">
        <Gauge size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
          Confidence:
        </span>
        <input
          type="range" min="20" max="80" step="5"
          value={confidence}
          onChange={e => onConfidenceChange(Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: 'var(--accent-green)' }}
        />
        <span
          className="text-xs font-mono font-bold w-10 text-right shrink-0"
          style={{ color: 'var(--accent-green)' }}
        >
          {confidence}%
        </span>
      </div>
    </div>
  )
}