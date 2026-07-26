import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'
import socket from '../lib/socket'
import Avatar from '../components/Avatar'
import { colorFor } from '../lib/colors'

import ProfileModal from '../components/ProfileModal'
import CreateRoomModal from '../components/CreateRoomModal'
import GlobalSearchModal from '../components/GlobalSearchModal'
import SettingsModal from '../components/SettingsModal'
import AdminPanelModal from '../components/AdminPanelModal'

export default function LobbyPage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { rooms, onlineUsers, unread } = useChatStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('all') // 'all' | 'dms' | 'groups' | 'channels' | 'unread'
  const [search, setSearch] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)

  function handleCreateRoom(data) {
    socket.emit('createRoom', data)
  }

  function handleJoinByInvite(e) {
    e.preventDefault()
    if (!inviteCodeInput.trim()) return
    socket.emit('joinByInvite', { code: inviteCodeInput.trim() })
    setInviteCodeInput('')
  }

  function startDM(targetUser) {
    socket.emit('startDM', { targetId: targetUser.id, targetUsername: targetUser.username })
  }

  // Socket listeners for room creation / join
  socket._callbacks?.['$dmCreated']?.length === 0 && socket.once('dmCreated', ({ roomId }) => {
    navigate(`/chat/${roomId}`)
  })

  socket.once('roomCreated', ({ room }) => {
    navigate(`/chat/${room.id}`)
  })

  socket.once('inviteResolved', ({ roomId }) => {
    navigate(`/chat/${roomId}`)
  })

  const filtered = rooms.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (activeTab === 'dms') return r.type === 'dm'
    if (activeTab === 'groups') return r.type === 'group'
    if (activeTab === 'channels') return r.type === 'channel'
    if (activeTab === 'unread') return (unread[r.id] || 0) > 0
    return true
  })

  const channelRooms = filtered.filter((r) => r.type === 'channel')
  const groupRooms = filtered.filter((r) => r.type === 'group')
  const dmRooms = filtered.filter((r) => r.type === 'dm')

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white select-none">
      {/* Modals */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showCreateModal && <CreateRoomModal onCreate={handleCreateRoom} onClose={() => setShowCreateModal(false)} />}
      {showSearchModal && <GlobalSearchModal onClose={() => setShowSearchModal(false)} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      {showAdminModal && <AdminPanelModal onClose={() => setShowAdminModal(false)} />}

      {/* Topbar */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-white/5 bg-[#13131a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/')}>
            <span>chat</span><span className="text-indigo-400">.</span><span>app</span>
          </div>
          <button onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 text-white/40 hover:text-white px-3 py-1.5 rounded-full text-xs transition">
            <span>🔍</span><span>Quick Search…</span>
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/60">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdminModal(true)} title="Admin Moderation"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition text-base">
            🛡️
          </button>
          <button onClick={() => setShowSettingsModal(true)} title="Settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition text-base">
            ⚙️
          </button>
          <div className="flex items-center gap-1.5 text-xs text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {(onlineUsers.length + 1)} online
          </div>
          <div onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition bg-white/5 border border-white/8 rounded-full px-2 py-1">
            <Avatar username={user.username} color={user.color} avatarEmoji={user.avatar} size={28} />
            <span className="text-xs font-semibold text-white pr-1">{user.username}</span>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-white/30 border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white/70 transition">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-white/5 bg-[#13131a] flex flex-col overflow-hidden">
          <div className="p-3 space-y-2 shrink-0 border-b border-white/5">
            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'groups', label: 'Groups' },
                { id: 'channels', label: 'Channels' },
                { id: 'dms', label: 'DMs' },
                { id: 'unread', label: 'Unread' }
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions: Create room & Join code */}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setShowCreateModal(true)}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl py-2 text-xs transition flex items-center justify-center gap-1 shadow-lg shadow-indigo-500/20">
                <span>+</span><span>New Room / Channel</span>
              </button>
            </div>

            <form onSubmit={handleJoinByInvite} className="flex gap-1.5">
              <input type="text" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="Enter invite code…"
                className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-indigo-500/50" />
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg px-3 py-1.5 text-xs transition">
                Join
              </button>
            </form>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {channelRooms.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1.5">
                  Channels ({channelRooms.length})
                </div>
                {channelRooms.map((r) => (
                  <RoomItem key={r.id} room={r} unread={unread[r.id]} onClick={() => navigate(`/chat/${r.id}`)} />
                ))}
              </>
            )}

            {groupRooms.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1.5">
                  Group Chats ({groupRooms.length})
                </div>
                {groupRooms.map((r) => (
                  <RoomItem key={r.id} room={r} unread={unread[r.id]} onClick={() => navigate(`/chat/${r.id}`)} />
                ))}
              </>
            )}

            {dmRooms.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-2 pt-3 pb-1.5">
                  Direct Messages ({dmRooms.length})
                </div>
                {dmRooms.map((r) => (
                  <RoomItem key={r.id} room={r} unread={unread[r.id]} onClick={() => navigate(`/chat/${r.id}`)} />
                ))}
              </>
            )}

            {filtered.length === 0 && (
              <div className="text-center text-white/25 text-xs py-8">
                No conversations found.
              </div>
            )}
          </div>

          {/* Online users */}
          <div className="border-t border-white/5 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-4 pt-3 pb-1.5">
              Online Contacts — {onlineUsers.length}
            </div>
            <div className="overflow-y-auto max-h-40 px-2 pb-2">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-3">No contacts online</p>
              ) : onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 group transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar username={u.username} color={u.color || colorFor(u.username)} avatarEmoji={u.avatar} size={24} />
                    <span className="text-xs text-white/70 truncate">{u.username}</span>
                  </div>
                  <button onClick={() => startDM(u)}
                    className="text-[10px] text-indigo-400 border border-indigo-500/30 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 hover:border-indigo-400 transition">
                    Start DM
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Banner */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-black text-white mb-2">Welcome back, {user.username}</h1>
            <p className="text-white/40 text-xs leading-relaxed mb-8">
              Select a conversation, start a broadcast channel, or initiate an audio/video WebRTC call with anyone online.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Conversations', value: rooms.length },
                { label: 'Online', value: onlineUsers.length + 1 },
                { label: 'DMs', value: dmRooms.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#13131a] border border-white/5 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-indigo-400">{value}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{label}</div>
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
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-white/5 text-left transition group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
        room.type === 'dm' ? 'bg-pink-500/10 text-pink-400' : room.type === 'channel' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
      }`}>
        {room.type === 'dm' ? '💬' : room.type === 'channel' ? '📢' : '#'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white/90 truncate group-hover:text-white transition">{room.name}</div>
        <div className="text-[11px] text-white/30 truncate">
          {room.lastMsg
            ? `${room.lastMsg.username}: ${room.lastMsg.image ? '📷 Image' : room.lastMsg.voice ? '🎙️ Voice' : room.lastMsg.text?.slice(0, 28)}`
            : 'No messages yet'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {unread > 0 && (
          <span className="bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread}
          </span>
        )}
        <span className="text-[10px] text-white/25">{room.memberCount} 👥</span>
      </div>
    </button>
  )
}
