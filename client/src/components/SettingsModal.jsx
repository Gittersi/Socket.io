import React, { useState } from 'react'

export default function SettingsModal({ onClose }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [theme, setTheme] = useState('dark') // 'dark' | 'glass' | 'light'
  const [lowData, setLowData] = useState(false)

  const handleRequestPush = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        alert('Desktop push notifications enabled!')
      } else {
        alert('Push notification permission denied.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            ⚙️ App Settings & Preferences
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
          {/* Notifications */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Notifications</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Sound Alerts</div>
                  <div className="text-[11px] text-white/40">Play subtle ping on incoming messages</div>
                </div>
                <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer" />
              </div>

              <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Browser Push Notifications</div>
                  <div className="text-[11px] text-white/40">Receive alert popups when app is minimized</div>
                </div>
                <button onClick={handleRequestPush}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
                    pushEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500 text-white'
                  }`}>
                  {pushEnabled ? 'Enabled ✓' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Aesthetics & Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark', label: '🌙 Dark Mode' },
                { id: 'glass', label: '💎 Glassmorphism' },
                { id: 'light', label: '☀️ Light Mode' }
              ].map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`p-2 text-xs font-semibold rounded-xl border transition text-center ${
                    theme === t.id ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Usage */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Data & Bandwidth</div>
            <div className="flex items-center justify-between bg-white/3 p-3 rounded-xl border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">Low Data Mode</div>
                <div className="text-[11px] text-white/40">Compress images and disable video auto-play</div>
              </div>
              <input type="checkbox" checked={lowData} onChange={(e) => setLowData(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-xs bg-indigo-500 hover:bg-indigo-400 font-bold text-white rounded-xl transition shadow-lg shadow-indigo-500/25">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
