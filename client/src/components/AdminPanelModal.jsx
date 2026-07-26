import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export default function AdminPanelModal({ onClose }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin/reports', {
        headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
      })
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            🛡️ Platform Moderation & Admin Panel
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
        </div>

        <div className="p-4 flex flex-col gap-3 max-h-[420px] overflow-y-auto">
          <div className="text-xs text-white/50">Reported Messages & Content Flags ({reports.length})</div>

          {loading && <div className="text-xs text-white/40 text-center py-6">Loading reports…</div>}

          {!loading && reports.length === 0 && (
            <div className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
              ✅ No content reports or flagged messages requiring action.
            </div>
          )}

          {reports.map((rep) => (
            <div key={rep.id} className="p-3 bg-[#1a1a24] border border-white/10 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-400">Reported User: {rep.username}</span>
                <span className="text-[10px] text-white/30">{new Date(rep.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-xs bg-black/40 p-2 rounded-lg text-white/80 font-mono italic">
                "{rep.msgText}"
              </div>
              <div className="text-[11px] text-white/50 flex items-center justify-between">
                <span>Reason: {rep.reason} · Reported by: {rep.reportedBy}</span>
                <button onClick={() => alert(`Action taken: Warning issued to ${rep.username}`)}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2.5 py-1 rounded-lg border border-red-500/30 font-semibold transition">
                  Issue Block
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-xs bg-indigo-500 hover:bg-indigo-400 font-bold text-white rounded-xl transition">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  )
}
