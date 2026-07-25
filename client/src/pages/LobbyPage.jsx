import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import socket from '../lib/socket'
import Avatar from '../components/Avatar'
import { colorFor } from '../lib/colors'

export default function LobbyPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { rooms, onlineUsers, unread } = useChatStore()
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [search, setSearch] = useState('')

  function createRoom(e) {
    e.preventDefault()
    const name = roomName.trim()
    if (name.length < 2) return
    socket.emit('createRoom', { name })
    setRoomName('')
  }

  function startDM(targetUser) {
    socket.emit('startDM', { targetId: targetUser.id, targetUsername: targetUser.username })
  }

  socket._callbacks?.['$dmCreated']?.length === 0 && socket.once('dmCreated', ({ roomId }) => {
    navigate(`/chat/${roomId}`)
  })

  // listen once for new room created by me
  socket.once('roomCreated', ({ room }) => {
    navigate(`/chat/${room.id}`)
  })

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )
  const groupRooms = filtered.filter((r) => r.type === 'group')
  const dmRooms = filtered.filter((r) => r.type === 'dm')

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Topbar */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-white/5 bg-[#13131a] shrink-0">
        <div className="text-[17px] font-black tracking-tight text-white">
          chat<span className="text-indigo-400">.</span>app
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {(onlineUsers.length + 1)} online
          </div>
          <Avatar username={user.username} color={user.color} size={30} />
          <span className="text-sm text-white/50">{user.username}</span>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-white/30 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white/70 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-white/5 bg-[#13131a] flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 shrink-0">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search rooms…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/30 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-indigo-500/50 transition"
              />
            </div>
            {/* Create room */}
            <form onSubmit={createRoom} className="flex gap-1.5">
              <input
                type="text"
                placeholder="New room…"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={30}
                className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-indigo-500/50 transition"
              />
              <button
                type="submit"
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg px-3 py-2 text-sm transition shrink-0"
              >
                +
              </button>
            </form>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {/* Group channels */}
            {groupRooms.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1.5">
                  Channels
                </div>
                {groupRooms.map((r) => (
                  <RoomItem key={r.id} room={r} unread={unread[r.id]} onClick={() => navigate(`/chat/${r.id}`)} />
                ))}
              </>
            )}
            {/* DMs */}
            {dmRooms.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1.5">
                  Direct Messages
                </div>
                {dmRooms.map((r) => (
                  <RoomItem key={r.id} room={r} unread={unread[r.id]} onClick={() => navigate(`/chat/${r.id}`)} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <div className="text-center text-white/25 text-xs py-8">
                {search ? 'No rooms match.' : 'No rooms yet. Create one!'}
              </div>
            )}
          </div>

          {/* Online users */}
          <div className="border-t border-white/5 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-4 pt-3 pb-1.5">
              People — {onlineUsers.length}
            </div>
            <div className="overflow-y-auto max-h-44 px-2 pb-2">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-3">No one else online</p>
              ) : onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 group transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar username={u.username} color={u.color || colorFor(u.username)} size={24} />
                    <span className="text-xs text-white/70 truncate">{u.username}</span>
                  </div>
                  <button
                    onClick={() => startDM(u)}
                    className="text-[10px] text-indigo-400 border border-indigo-500/30 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 hover:border-indigo-400 transition"
                  >
                    DM
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Welcome panel */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-5">💬</div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome, {user.username}</h1>
            <p className="text-white/40 text-sm leading-relaxed mb-8">
              Pick a channel from the sidebar, create a new room, or DM someone who's online.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Rooms', value: rooms.length },
                { label: 'Online', value: onlineUsers.length + 1 },
                { label: 'DMs', value: dmRooms.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#13131a] border border-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-indigo-400">{value}</div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function RoomItem({ room, unread, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 text-left transition group"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
        room.type === 'dm' ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400'
      }`}>
        {room.type === 'dm' ? '💬' : '#'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/80 truncate group-hover:text-white transition">{room.name}</div>
        <div className="text-[11px] text-white/30 truncate">
          {room.lastMsg
            ? `${room.lastMsg.username}: ${room.lastMsg.image ? '📷 Image' : room.lastMsg.text?.slice(0, 28)}`
            : 'No messages yet'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {unread > 0 && (
          <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread}
          </span>
        )}
        <span className="text-[10px] text-white/25">{room.memberCount} 🟢</span>
      </div>
    </button>
  )
}
