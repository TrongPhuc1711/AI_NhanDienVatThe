/**
 * StatsPanel — Bảng thống kê phòng học (redesigned)
 */
import React, { memo } from 'react'
import { Wifi, WifiOff, Users, Smartphone, Zap, Clock } from 'lucide-react'

const StatsPanel = memo(function StatsPanel({
  counts, detections, processingMs, fps, isConnected, phoneAlert
}) {
  const phoneCnt = counts['cell phone'] || 0
  const studentCnt = counts['person'] || 0
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const violationRate = studentCnt > 0 ? Math.round((phoneCnt / studentCnt) * 100) : 0

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Connection status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono
        ${isConnected
          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
        {isConnected
          ? <><Wifi size={12} /><span>Hệ thống hoạt động</span></>
          : <><WifiOff size={12} /><span>Mất kết nối server</span></>}
      </div>

      {/* Phone Alert Card */}
      {phoneAlert && (
        <div className="rounded-xl overflow-hidden border border-amber-500/60"
          style={{ background: 'linear-gradient(135deg,#2d1800,#1c1000)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20"
            style={{ background: 'rgba(245,158,11,0.08)' }}>
            <span className="text-base">📱</span>
            <span className="text-amber-300 font-bold text-xs tracking-wide">CẢNH BÁO VI PHẠM</span>
          </div>
          <div className="px-3 py-2.5 text-sm font-mono">
            <span className="text-amber-200 font-bold text-lg">{phoneCnt}</span>
            <span className="text-amber-500/70 text-xs ml-1">điện thoại phát hiện</span>
          </div>
        </div>
      )}

      {/* 4 main metric cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={<Users size={15} />} label="Học sinh" value={studentCnt} accent="#4a9eff" />
        <MetricCard icon={<Smartphone size={15} />} label="Điện thoại" value={phoneCnt}
          accent={phoneCnt > 0 ? '#f59e0b' : '#4a9eff'} alert={phoneCnt > 0} />
        <MetricCard icon={<Zap size={15} />} label="FPS" value={fps} accent="#34d399" />
        <MetricCard icon={<Clock size={15} />} label="Latency" value={`${processingMs}ms`} accent="#a78bfa" />
      </div>

      {/* Violation rate */}
      {studentCnt > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: '#1e3a5f', background: '#071428' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono" style={{ color: '#3d7ab5' }}>TỶ LỆ VI PHẠM</span>
            <span className="text-sm font-bold font-mono"
              style={{ color: phoneCnt > 0 ? '#f59e0b' : '#34d399' }}>
              {violationRate}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: '#0a1e38' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(violationRate, 100)}%`,
                background: phoneCnt > 0
                  ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                  : 'linear-gradient(90deg,#10b981,#34d399)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono" style={{ color: '#2a5a80' }}>
            <span>{phoneCnt} / {studentCnt} học sinh</span>
            <span>{phoneCnt === 0 ? 'Bình thường ✓' : 'Cần chú ý !'}</span>
          </div>
        </div>
      )}

      {/* Object list */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e3a5f', background: '#071428' }}>
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: '#1e3a5f' }}>
          <span className="text-xs font-mono font-bold" style={{ color: '#3d7ab5' }}>VẬT THỂ PHÁT HIỆN</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full font-bold"
            style={{ background: '#0a1e38', color: '#4a9eff' }}>{total}</span>
        </div>
        <div className="p-2 space-y-1 max-h-36 overflow-y-auto">
          {Object.entries(counts).length === 0 ? (
            <div className="flex flex-col items-center py-5 gap-1.5">
              <span className="text-xl opacity-30">🔍</span>
              <p className="text-xs font-mono" style={{ color: '#1e3a5f' }}>Chưa phát hiện vật thể</p>
            </div>
          ) : (
            Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
              <ObjectRow key={label} label={label} count={count} />
            ))
          )}
        </div>
      </div>

      {/* Confidence breakdown */}
      {detections.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e3a5f', background: '#071428' }}>
          <div className="px-3 py-2 border-b" style={{ borderColor: '#1e3a5f' }}>
            <span className="text-xs font-mono font-bold" style={{ color: '#3d7ab5' }}>ĐỘ CHÍNH XÁC</span>
          </div>
          <div className="max-h-28 overflow-y-auto divide-y" style={{ borderColor: '#0a1e38' }}>
            {detections.map((det, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-sm w-5 shrink-0">{ICONS[det.label] || '❓'}</span>
                <span className="flex-1 text-xs font-mono truncate" style={{ color: '#8bb8d8' }}>{det.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: '#0a1e38' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${det.confidence * 100}%`, background: det.color }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right" style={{ color: '#3d7ab5' }}>
                    {(det.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default StatsPanel

// ── Sub-components ─────────────────────────────────

const ICONS = {
  'person': '🧑', 'cell phone': '📱', 'laptop': '💻', 'mouse': '🖱️',
  'remote': '📺', 'tv': '🖥️', 'chair': '🪑', 'dining table': '🍽️',
}

const MetricCard = memo(function MetricCard({ icon, label, value, accent, alert }) {
  return (
    <div className={`rounded-xl p-3 border transition-all duration-300 ${alert ? 'scale-[1.02]' : ''}`}
      style={{
        borderColor: accent + '33',
        background: accent + '0d',
      }}>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: accent + 'aa' }}>{icon}</span>
        {alert && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      <div className="font-bold text-xl leading-none font-mono" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs mt-1 font-mono" style={{ color: '#2a5a80' }}>{label}</div>
    </div>
  )
})

const ObjectRow = memo(function ObjectRow({ label, count }) {
  const isPhone = label === 'cell phone'
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
      style={{ background: isPhone ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)' }}>
      <span className="text-sm w-5">{ICONS[label] || '❓'}</span>
      <span className="flex-1 text-xs font-mono truncate"
        style={{ color: isPhone ? '#fbbf24' : '#8bb8d8' }}>{label}</span>
      <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
        style={{
          background: isPhone ? 'rgba(245,158,11,0.2)' : 'rgba(74,158,255,0.12)',
          color: isPhone ? '#fbbf24' : '#4a9eff'
        }}>
        {count}
      </span>
    </div>
  )
})