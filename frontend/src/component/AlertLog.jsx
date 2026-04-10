/**
 * AlertLog — Ghi lại lịch sử cảnh báo điện thoại
 * Hiển thị timestamp + badge đỏ cho mỗi lần phát hiện
 */
import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

export default function AlertLog({ phoneAlert }) {
  const [logs, setLogs] = useState([])
  const prevAlertRef = useRef(false)

  // Chỉ ghi log khi trạng thái chuyển false → true (tránh log liên tục)
  useEffect(() => {
    if (phoneAlert && !prevAlertRef.current) {
      const now = new Date()
      const timestamp = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      setLogs(prev => [
        { id: Date.now(), time: timestamp },
        ...prev.slice(0, 19)   // Giữ tối đa 20 log gần nhất
      ])
    }
    prevAlertRef.current = phoneAlert
  }, [phoneAlert])

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400" />
          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
            ALERT LOG
          </span>
          {logs.length > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-bold font-mono"
              style={{ background: '#FF444433', color: '#FF4444' }}
            >
              {logs.length}
            </span>
          )}
        </div>

        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            className="text-xs font-mono flex items-center gap-1 hover:text-red-400 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={11} /> Xóa
          </button>
        )}
      </div>

      {/* Log list */}
      <div className="max-h-32 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-center py-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Chưa có cảnh báo
          </p>
        ) : (
          logs.map((log, i) => (
            <div
              key={log.id}
              className="flex items-center gap-3 px-4 py-2 border-b last:border-0 animate-slide-in"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Dot */}
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: i === 0 ? '#FF4444' : '#FF444488' }}
              />
              {/* Icon */}
              <span className="text-sm">📱</span>
              {/* Text */}
              <span className="flex-1 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                Điện thoại phát hiện
              </span>
              {/* Time */}
              <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {log.time}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}