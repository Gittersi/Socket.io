import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function GlobalSearchModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ rooms: [], messages: [] })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ rooms: [], messages: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` }
        })
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error('Search error', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelectRoom = (roomId) => {
    onClose()
    navigate(`/chat/${roomId}`)
  }

  const highlightMatch = (text, q) => {
    if (!q) return text
    const parts = text.split(new RegExp(`(${q})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-indigo-500/40 text-white rounded px-0.5 font-bold">{part}</mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-[#13131a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="p-3 border-b border-white/5 flex items-center gap-3 bg-[#1a1a24]">
          <span className="text-white/40 text-base">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, channels, and groups..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
          <button onClick={onClose} className="text-xs text-white/40 hover:text-white px-2 py-1">Esc</button>
        </div>

        <div className="p-4 max-h-[380px] overflow-y-auto flex flex-col gap-4">
          {loading && <div className="text-xs text-white/40 text-center py-4">Searching…</div>}

          {!loading && query.length >= 2 && results.rooms.length === 0 && results.messages.length === 0 && (
            <div className="text-xs text-white/40 text-center py-6">No matching messages or rooms found.</div>
          )}

          {/* Room Results */}
          {results.rooms.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Rooms & Channels</div>
              <div className="flex flex-col gap-1">
                {results.rooms.map((r) => (
                  <button key={r.id} onClick={() => handleSelectRoom(r.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 hover:bg-indigo-500/10 border border-white/5 transition text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">#</span>
                      <span className="text-xs font-semibold text-white">{highlightMatch(r.name, query)}</span>
                    </div>
                    <span className="text-[10px] text-white/40">{r.memberCount} members</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Results */}
          {results.messages.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Messages</div>
              <div className="flex flex-col gap-1.5">
                {results.messages.map((m) => (
                  <button key={m.msgId} onClick={() => handleSelectRoom(m.roomId)}
                    className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/3 hover:bg-indigo-500/10 border border-white/5 transition text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-indigo-300">{m.username} in #{m.roomName}</span>
                      <span className="text-[10px] text-white/30">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-xs text-white/80 line-clamp-2">{highlightMatch(m.text, query)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
