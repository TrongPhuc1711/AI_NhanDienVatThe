/**
 * HistoryChart — Biểu đồ số lượng object theo thời gian
 * Vẽ bằng SVG thuần, không cần thư viện ngoài
 */
import React, { useEffect, useRef } from 'react'

const MAX_POINTS   = 40          // Số điểm dữ liệu hiển thị
const CHART_H      = 80          // Chiều cao vùng vẽ (px)
const CLASS_COLORS = {
  person:      '#00FF88',
  'cell phone':'#FF4444',
  laptop:      '#4488FF',
}

export default function HistoryChart({ counts }) {
  // historyRef lưu mảng snapshot theo thời gian
  const historyRef = useRef([])

  // Mỗi khi counts thay đổi → ghi thêm 1 điểm
  useEffect(() => {
    historyRef.current.push({ ...counts, _t: Date.now() })
    if (historyRef.current.length > MAX_POINTS) {
      historyRef.current.shift()
    }
  }, [counts])

  const history = historyRef.current
  const total   = history.length

  if (total < 2) {
    return (
      <div className="flex items-center justify-center h-20 text-xs font-mono"
        style={{ color: 'var(--text-muted)' }}>
        Đang thu thập dữ liệu...
      </div>
    )
  }

  // Tìm max value để scale
  const allValues = history.flatMap(h =>
    Object.keys(CLASS_COLORS).map(k => h[k] || 0)
  )
  const maxVal = Math.max(...allValues, 1)

  // Tạo polyline points cho từng class
  const w = 100 // percentage width
  const buildPath = (cls) => {
    const pts = history.map((h, i) => {
      const x = (i / (total - 1)) * 100
      const y = CHART_H - ((h[cls] || 0) / maxVal) * CHART_H
      return `${x},${y}`
    })
    return pts.join(' ')
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
          📈 LỊCH SỬ DETECTION
        </span>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {Object.entries(CLASS_COLORS).map(([cls, color]) => (
            <div key={cls} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {cls === 'cell phone' ? 'phone' : cls}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-4 py-3">
        <svg
          viewBox={`0 0 100 ${CHART_H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: CHART_H }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(v => (
            <line
              key={v}
              x1="0" y1={CHART_H - v * CHART_H}
              x2="100" y2={CHART_H - v * CHART_H}
              stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"
            />
          ))}

          {/* Lines per class */}
          {Object.entries(CLASS_COLORS).map(([cls, color]) => (
            <g key={cls}>
              {/* Area fill */}
              <polyline
                points={`0,${CHART_H} ${buildPath(cls)} 100,${CHART_H}`}
                fill={color + '18'}
                stroke="none"
              />
              {/* Line */}
              <polyline
                points={buildPath(cls)}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}
        </svg>

        {/* Time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            -{MAX_POINTS}s
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            now
          </span>
        </div>
      </div>
    </div>
  )
}