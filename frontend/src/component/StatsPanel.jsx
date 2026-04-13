/**
 * StatsPanel — Bảng thống kê phòng học (memo hóa để tránh re-render thừa)
 */
import React, { memo } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

const StatsPanel = memo(function StatsPanel({
  counts, detections, processingMs, fps, isConnected, phoneAlert
}) {
  const phoneCnt   = counts['cell phone'] || 0
  const studentCnt = counts['person'] || 0
  const total      = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Kết nối */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border
        ${isConnected
          ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-400'
          : 'border-red-700/40 bg-red-950/30 text-red-400'}`}>
        {isConnected
          ? <><Wifi size={12}/> Hệ thống hoạt động</>
          : <><WifiOff size={12}/> Mất kết nối server</>}
      </div>

      {/* Alert Phone */}
      {phoneAlert && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500 bg-amber-950/50 p-4">
          <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-lg shrink-0">
              📱
            </div>
            <div>
              <p className="text-amber-300 font-bold text-sm" style={{fontFamily:'Outfit,sans-serif'}}>
                Phát hiện điện thoại!
              </p>
              <p className="text-amber-500/80 text-xs mt-0.5 font-mono">
                {phoneCnt} thiết bị trong khung hình
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Thống kê chính */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard emoji="🧑‍🎓" label="Học sinh"   value={studentCnt} color="blue" />
        <MetricCard emoji="📱"    label="Điện thoại" value={phoneCnt}   color={phoneCnt > 0 ? 'amber' : 'slate'} highlight={phoneCnt > 0} />
        <MetricCard emoji="⚡"    label="FPS"         value={fps}        color="purple" />
        <MetricCard emoji="⏱"    label="Latency"    value={`${processingMs}ms`} color="teal" />
      </div>

      {/* Tỷ lệ vi phạm */}
      {studentCnt > 0 && (
        <div className="rounded-xl border p-4" style={{borderColor:'#1e3a5f', background:'#071428'}}>
          <p className="text-xs font-mono mb-3" style={{color:'#3d7ab5'}}>TỶ LỆ VI PHẠM</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span style={{color:'#3d7ab5'}}>Điện thoại / Học sinh</span>
                <span style={{color: phoneCnt > 0 ? '#f59e0b' : '#10b981'}}>
                  {phoneCnt}/{studentCnt}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{background:'#0d2544'}}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((phoneCnt/studentCnt)*100, 100)}%`,
                    background: phoneCnt > 0 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : '#10b981',
                  }}
                />
              </div>
            </div>
            <span className="text-xl font-bold shrink-0"
              style={{fontFamily:'Outfit,sans-serif', color: phoneCnt > 0 ? '#f59e0b' : '#10b981'}}>
              {`${Math.round((phoneCnt/studentCnt)*100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Danh sách vật thể */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{borderColor:'#1e3a5f', background:'#071428'}}>
        <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{borderColor:'#1e3a5f'}}>
          <span className="text-xs font-mono" style={{color:'#3d7ab5'}}>VẬT THỂ PHÁT HIỆN</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
            style={{background:'#0d2544', color:'#4a9eff'}}>{total}</span>
        </div>
        <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
          {Object.entries(counts).length === 0 ? (
            <p className="text-center py-6 text-xs font-mono" style={{color:'#2a5a80'}}>
              Chưa phát hiện vật thể nào
            </p>
          ) : (
            Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label, count]) => (
              <ObjectRow key={label} label={label} count={count} />
            ))
          )}
        </div>
      </div>

      {/* Confidence log */}
      {detections.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{borderColor:'#1e3a5f', background:'#071428'}}>
          <div className="px-4 py-2.5 border-b" style={{borderColor:'#1e3a5f'}}>
            <span className="text-xs font-mono" style={{color:'#3d7ab5'}}>ĐỘ CHÍNH XÁC</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {detections.map((det, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-1.5 border-b last:border-0 text-xs font-mono"
                style={{borderColor:'#0d2544'}}>
                <span style={{color:'#c8dff0'}}>{ICONS[det.label]||'❓'} {det.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1 rounded-full overflow-hidden" style={{background:'#0d2544'}}>
                    <div className="h-full rounded-full" style={{width:`${det.confidence*100}%`, background:det.color}}/>
                  </div>
                  <span style={{color:'#3d7ab5'}}>{(det.confidence*100).toFixed(0)}%</span>
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

// ── Sub-components (memo hóa) ──────────────────────

const ICONS = {
  'person':'🧑','cell phone':'📱','laptop':'💻','mouse':'🖱️',
  'remote':'📺','tv':'🖥️','chair':'🪑','dining table':'🍽️',
}

const COLOR_MAP = {
  blue:  {border:'#1e4a8a', bg:'#071d3a', text:'#4a9eff'},
  amber: {border:'#92400e', bg:'#1c0e00', text:'#f59e0b'},
  purple:{border:'#4a2070', bg:'#0f0520', text:'#a78bfa'},
  teal:  {border:'#0f4a4a', bg:'#021414', text:'#2dd4bf'},
  slate: {border:'#1e3a5f', bg:'#071428', text:'#3d7ab5'},
}

const MetricCard = memo(function MetricCard({ emoji, label, value, color, highlight }) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate
  return (
    <div className={`rounded-xl p-3 border text-center transition-all duration-300 ${highlight ? 'scale-105' : ''}`}
      style={{borderColor:c.border, background:c.bg}}>
      <div className="text-xl mb-0.5">{emoji}</div>
      <div className="font-bold text-lg leading-none" style={{color:c.text, fontFamily:'Outfit,sans-serif'}}>{value}</div>
      <div className="text-xs mt-1 font-mono" style={{color:'#2a5a80'}}>{label}</div>
    </div>
  )
})

const ObjectRow = memo(function ObjectRow({ label, count }) {
  const isPhone = label === 'cell phone'
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg"
      style={{background: isPhone ? '#1c0e00' : 'rgba(255,255,255,0.02)'}}>
      <div className="flex items-center gap-2 text-sm">
        <span>{ICONS[label]||'❓'}</span>
        <span className="text-xs font-mono" style={{color: isPhone ? '#f59e0b' : '#c8dff0'}}>{label}</span>
      </div>
      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full"
        style={{background: isPhone ? '#92400e' : '#0d2544', color: isPhone ? '#fbbf24' : '#4a9eff'}}>
        {count}
      </span>
    </div>
  )
})