/**
 * AlertLog — Nhật ký vi phạm điện thoại trong lớp học
 */
import React, { useState, useEffect, useRef } from 'react'
import { Trash2, ShieldAlert } from 'lucide-react'

export default function AlertLog({ phoneAlert }) {
  const [logs, setLogs] = useState([])
  const prevAlertRef = useRef(false)
  const sessionStartRef = useRef(new Date())

  useEffect(() => {
    if (phoneAlert && !prevAlertRef.current) {
      const now = new Date()
      const elapsed = Math.floor((now - sessionStartRef.current) / 1000)
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
      const secs = String(elapsed % 60).padStart(2, '0')
      setLogs(prev => [
        {
          id: Date.now(),
          time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          elapsed: `+${mins}:${secs}`,
        },
        ...prev.slice(0, 29),
      ])
    }
    prevAlertRef.current = phoneAlert
  }, [phoneAlert])

  const violationRate = logs.length

  return (
    <div className="rounded-xl border overflow-hidden" style={{borderColor:'#1e3a5f', background:'#071428'}}>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between"
        style={{borderColor:'#1e3a5f', background:'#04101f'}}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{background: logs.length > 0 ? '#92400e' : '#0d2544'}}>
            <ShieldAlert size={13} style={{color: logs.length > 0 ? '#fbbf24' : '#3d7ab5'}} />
          </div>
          <div>
            <span className="text-xs font-mono font-bold" style={{color:'#c8dff0'}}>NHẬT KÝ VI PHẠM</span>
            <span className="text-xs font-mono ml-2" style={{color:'#2a5a80'}}>
              phiên {sessionStartRef.current.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono"
              style={{background:'#92400e', color:'#fbbf24'}}>
              {logs.length} lần
            </span>
          )}
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1 text-xs font-mono transition-colors hover:opacity-80"
              style={{color:'#2a5a80'}}>
              <Trash2 size={11}/> Xóa
            </button>
          )}
        </div>
      </div>

      {/* Severity bar */}
      {logs.length > 0 && (
        <div className="px-4 py-2 border-b" style={{borderColor:'#0d2544'}}>
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span style={{color:'#3d7ab5'}}>Mức độ nghiêm trọng</span>
            <span style={{color: violationRate >= 5 ? '#ef4444' : violationRate >= 3 ? '#f59e0b' : '#10b981'}}>
              {violationRate >= 5 ? '🔴 Cao' : violationRate >= 3 ? '🟡 Trung bình' : '🟢 Thấp'}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#0d2544'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((violationRate / 10) * 100, 100)}%`,
                background: violationRate >= 5
                  ? 'linear-gradient(90deg,#f59e0b,#ef4444)'
                  : violationRate >= 3 ? '#f59e0b' : '#10b981',
              }} />
          </div>
        </div>
      )}

      {/* Log list */}
      <div className="max-h-28 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-5 gap-2">
            <div className="text-2xl opacity-30">✅</div>
            <p className="text-xs font-mono" style={{color:'#2a5a80'}}>
              Chưa phát hiện vi phạm
            </p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id}
              className="flex items-center gap-3 px-4 py-2 border-b last:border-0"
              style={{borderColor:'#0d2544', background: i === 0 ? '#1c0e0022' : 'transparent'}}>
              {/* index badge */}
              <span className="text-xs font-bold font-mono w-5 text-right shrink-0"
                style={{color:'#2a5a80'}}>
                {logs.length - i}
              </span>
              <span className="text-sm shrink-0">📱</span>
              <span className="flex-1 text-xs font-mono" style={{color:'#c8dff0'}}>
                Phát hiện điện thoại
              </span>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold" style={{color: i === 0 ? '#f59e0b' : '#3d7ab5'}}>
                  {log.time}
                </div>
                <div className="text-xs font-mono" style={{color:'#1e3a5f'}}>
                  {log.elapsed}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}