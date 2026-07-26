import React, { useState } from 'react'
import Avatar from './Avatar'
import { useAuthStore } from '../store/useAuthStore'
import socket from '../lib/socket'

export default function GroupInfoDrawer({ room, members, onClose, myRole }) {
  const currentUser = useAuthStore((s) => s.user)
  const [copied, setCopied] = useState(false)

  const handleCopyInvite = () => {
    if (!room?.inviteCode) return
    navigator.clipboard.writeText(room.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKick = (targetUserId) => {
    if (!confirm('Are you sure you want to kick this member?')) return
    socket.emit('kickMember', { roomId: room.id, targetUserId })
  }

  const handlePromote = (targetUserId) => {
    socket.emit('promoteAdmin', { roomId: room.id, targetUserId })
  }

  return (
    <aside className="w-64 shrink-0 border-l border-white/5 bg-[#13131a] flex flex-col h-full overflow-y-auto p-4 z-20">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Room Info & Members</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition">✕</button>
      </div>

      {/* Room Details */}
      <div className="flex flex-col items-center text-center p-3 bg-white/3 border border-white/5 rounded-2xl mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold mb-2 ${
          room?.type === 'dm' ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400'
        }`}>
          {room?.type === 'dm' ? '💬' : room?.type === 'channel' ? '📢' : '#'}
        </div>
        <div className="text-sm font-bold text-white">{room?.name}</div>
        <div className="text-xs text-white/40 capitalize">{room?.type} · created by {room?.createdBy}</div>
        {room?.description && <p className="text-xs text-white/60 mt-2 italic">{room.description}</p>}
      </div>

      {/* Invite Code */}
      {room?.inviteCode && (
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-3 mb-4">
          <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Invite Code</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-indigo-300">{room.inviteCode}</span>
            <button onClick={handleCopyInvite}
              className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-2.5 py-1 rounded-lg transition font-medium">
              {copied ? 'Copied! ✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 flex flex-col">
        <div className="text-[10px] uppercase font-bold text-white/40 mb-2">
          Members ({members.length})
        </div>
        <div className="flex flex-col gap-2">
          {members.map((m) => {
            const isAdmin = room?.createdBy === m.username || m.role === 'admin'
            const isMe = m.id === currentUser?.id

            return (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar username={m.username} color={m.color} size={28} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {m.username} {isMe && <span className="text-[10px] text-white/30">(You)</span>}
                    </div>
                    <div className="text-[10px] text-white/40">{isAdmin ? '👑 Admin' : 'Member'}</div>
                  </div>
                </div>

                {/* Actions for Admins */}
                {myRole === 'admin' && !isMe && !isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handlePromote(m.id)} title="Promote to Admin"
                      className="text-xs p-1 text-indigo-400 hover:bg-indigo-500/10 rounded">👑</button>
                    <button onClick={() => handleKick(m.id)} title="Kick Member"
                      className="text-xs p-1 text-red-400 hover:bg-red-500/10 rounded">🚫</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
