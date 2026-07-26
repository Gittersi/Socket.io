import React, { useState } from 'react'

export default function ImageEditModal({ imageSrc, onSend, onClose }) {
  const [rotation, setRotation] = useState(0)
  const [filter, setFilter] = useState('none')
  const [brightness, setBrightness] = useState(100)

  const FILTERS = [
    { name: 'Normal', value: 'none' },
    { name: 'Grayscale', value: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia(100%)' },
    { name: 'Contrast', value: 'contrast(150%)' },
    { name: 'Vintage', value: 'sepia(50%) contrast(120%)' }
  ]

  const handleSendProcessedImage = () => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (rotation % 180 === 0) {
        canvas.width = img.width
        canvas.height = img.height
      } else {
        canvas.width = img.height
        canvas.height = img.width
      }

      ctx.filter = `${filter !== 'none' ? filter : ''} brightness(${brightness}%)`
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      const processedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
      onSend(processedDataUrl)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">📷 Edit & Filter Image</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
        </div>

        <div className="p-4 flex items-center justify-center bg-black/40 min-h-[260px] overflow-hidden">
          <img
            src={imageSrc}
            alt="Preview"
            style={{
              transform: `rotate(${rotation}deg)`,
              filter: `${filter !== 'none' ? filter : ''} brightness(${brightness}%)`,
              maxHeight: '260px',
              objectFit: 'contain'
            }}
            className="transition-all rounded-lg shadow-md"
          />
        </div>

        {/* Controls */}
        <div className="p-4 flex flex-col gap-3 bg-[#1a1a24]">
          <div className="flex items-center gap-2">
            <button onClick={() => setRotation((r) => (r + 90) % 360)}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-white transition flex items-center gap-1">
              🔄 Rotate (90°)
            </button>
            <div className="flex-1 flex items-center gap-2 px-2">
              <span className="text-[11px] text-white/40">Brightness</span>
              <input type="range" min="50" max="150" value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="w-full accent-indigo-500" />
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-white/40 block mb-1.5">Filters</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button key={f.name} onClick={() => setFilter(f.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                    filter === f.value ? 'bg-indigo-500 border-indigo-400 text-white font-bold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/50 hover:text-white transition">Cancel</button>
          <button onClick={handleSendProcessedImage} className="px-5 py-2 text-xs bg-indigo-500 hover:bg-indigo-400 font-bold text-white rounded-xl transition shadow-lg shadow-indigo-500/25">
            Send Image
          </button>
        </div>
      </div>
    </div>
  )
}
