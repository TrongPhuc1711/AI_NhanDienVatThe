/**
 * CameraView — Component hiển thị video + canvas overlay
 */
import React, { useEffect } from 'react'

export default function CameraView({ videoRef, canvasRef, isRunning, phoneAlert }) {
  // Đồng bộ kích thước canvas với video
  useEffect(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const syncSize = () => {
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
    }

    video.addEventListener('loadedmetadata', syncSize)
    return () => video.removeEventListener('loadedmetadata', syncSize)
  }, [videoRef, canvasRef])

  return (
    <div
      className={`
        relative w-full aspect-video rounded-xl overflow-hidden
        border-2 transition-all duration-300 scan-overlay
        ${phoneAlert
          ? 'border-red-500 phone-alert'
          : isRunning
            ? 'border-green-400 glow-green'
            : 'border-slate-700'
        }
      `}
      style={{ background: '#000' }}
    >
      {/* Corner brackets */}
      {['tl','tr','bl','br'].map(pos => (
        <div key={pos} className={`corner-bracket ${pos}`} />
      ))}

      {/* Video element — bị lật ngang (mirror) để tự nhiên hơn */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
      />

      {/* Canvas overlay — vẽ bounding boxes lên trên video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        
      />

      {/* Placeholder khi chưa bật camera */}
      {!isRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="text-6xl opacity-30">📷</div>
          <p className="text-slate-500 font-mono text-sm">
            Nhấn START để bật camera
          </p>
        </div>
      )}

      {/* Badge LIVE */}
      {isRunning && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-fast" />
          <span className="text-green-400 font-mono text-xs font-bold">LIVE</span>
        </div>
      )}

      {/* Phone Alert Banner */}
      {phoneAlert && (
        <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-center py-2 font-bold text-sm animate-pulse">
          ⚠️ PHÁT HIỆN ĐIỆN THOẠI!
        </div>
      )}
    </div>
  )
}