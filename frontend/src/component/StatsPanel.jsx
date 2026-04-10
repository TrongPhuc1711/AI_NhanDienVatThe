/**
 * StatsPanel — Hiển thị thống kê realtime bên phải
 */
import React from 'react'
import { Activity, Users, Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

// Emoji icon cho từng class
const CLASS_ICONS = {
  'person':      '🧑',
  'cell phone':  '📱',
  'laptop':      '💻',
  'mouse':       '🖱️',
  'remote':      '📺',
  'tv':          '🖥️',
  'chair':       '🪑',
  'dining table':'🍽️',
}

export default function StatsPanel({
  counts, detections, processingMs, fps, isConnected, phoneAlert
}) {
  const total     = Object.values(counts).reduce((a, b) => a + b, 0)
  const personCnt = counts['person'] || 0

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Kết nối backend ── */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono
        ${isConnected
          ? 'border-green-500/40 bg-green-500/10 text-green-400'
          : 'border-red-500/40 bg-red-500/10 text-red-400'
        }
      `}>
        {isConnected
          ? <><Wifi size={14} /> Backend: Kết nối</>
          : <><WifiOff size={14} /> Backend: Mất kết nối</>
        }
      </div>

      {/* ── Số liệu chính ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Activity size={18} />} label="FPS" value={fps} color="blue" />
        <StatCard icon={<Cpu size={18} />} label="Xử lý" value={`${processingMs}ms`} color="purple" />
        <StatCard icon={<Users size={18} />} label="Người" value={personCnt} color="green" highlight={personCnt > 0} />
        <StatCard icon="🎯" label="Tổng" value={total} color="yellow" />
      </div>

      {/* ── Cảnh báo điện thoại ── */}
      {phoneAlert && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-red-500 bg-red-500/15 animate-slide-in">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-400 font-bold text-sm">CẢNH BÁO!</p>
            <p className="text-red-300 text-xs">Phát hiện điện thoại</p>
          </div>
        </div>
      )}

      {/* ── Số lượng từng object ── */}
      <div
        className="flex-1 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
            OBJECTS DETECTED
          </span>
        </div>

        <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
          {Object.keys(counts).length === 0 ? (
            <p className="text-center py-6 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              Chưa phát hiện vật thể
            </p>
          ) : (
            Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([label, count]) => (
                <ObjectRow key={label} label={label} count={count} />
              ))
          )}
        </div>
      </div>

      {/* ── Danh sách chi tiết ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
            CONFIDENCE LOG
          </span>
        </div>

        <div className="max-h-40 overflow-y-auto">
          {detections.length === 0 ? (
            <p className="text-center py-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              —
            </p>
          ) : (
            detections.map((det, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2 border-b last:border-0 text-xs font-mono"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{CLASS_ICONS[det.label] || '❓'}</span>
                  <span style={{ color: det.color }}>{det.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBar value={det.confidence} color={det.color} />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {(det.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────

function StatCard({ icon, label, value, color, highlight }) {
  const colorMap = {
    blue:   { border: '#4488FF44', bg: '#4488FF11', text: '#4488FF' },
    purple: { border: '#9B59B644', bg: '#9B59B611', text: '#9B59B6' },
    green:  { border: '#00FF8844', bg: '#00FF8811', text: '#00FF88' },
    yellow: { border: '#FFD70044', bg: '#FFD70011', text: '#FFD700' },
  }
  const c = colorMap[color]
  return (
    <div
      className="rounded-xl p-3 border text-center transition-all"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div className="flex justify-center mb-1" style={{ color: c.text }}>
        {typeof icon === 'string' ? <span>{icon}</span> : icon}
      </div>
      <div className="font-bold text-xl" style={{ color: c.text, fontFamily: 'JetBrains Mono' }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function ObjectRow({ label, count }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center gap-2 text-sm">
        <span>{CLASS_ICONS[label] || '❓'}</span>
        <span style={{ color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <span
        className="px-2 py-0.5 rounded-full text-xs font-bold font-mono"
        style={{ background: 'var(--accent-blue)', color: '#000' }}
      >
        {count}
      </span>
    </div>
  )
}

function ConfidenceBar({ value, color }) {
  return (
    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${value * 100}%`, background: color }}
      />
    </div>
  )
}