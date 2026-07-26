import { v4 as uuid } from 'uuid'
import { rooms, sockets, onlineUserIds, serializeMsg, serializeReactions } from '../lib/store.js'
import { broadcastLobby } from '../lib/broadcast.js'
import { updateLastSeen } from '../lib/userRepository.js'
import { moderateText } from '../lib/moderation.js'

const MSG_EDIT_WINDOW_MS = 15 * 60 * 1000  // 15 minutes

export function registerChatHandlers(io, socket) {
  const currentUser = socket.data.user
  let currentRoom   = null

  if (!currentUser) { socket.disconnect(true); return }

  // ── Join room ───────────────────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (currentRoom && currentRoom !== roomId) leaveRoom(currentRoom)

    currentRoom = roomId
    socket.join(roomId)
    room.members.add(currentUser.id)
    if (!room.memberRoles) room.memberRoles = new Map()
    if (!room.memberRoles.has(currentUser.id)) room.memberRoles.set(currentUser.id, 'member')
    sockets.set(socket.id, { userId: currentUser.id, roomId })

    socket.emit('roomHistory', {
      roomId,
      messages:    room.messages.slice(-80).map(serializeMsg),
      memberCount: room.members.size,
      pinnedMsg:   room.pinnedMsg ?? null,
      myRole:      room.memberRoles.get(currentUser.id) ?? 'member',
    })
    socket.to(roomId).emit('userJoined', { user: currentUser, memberCount: room.members.size })
    broadcastLobby()
  })

  // ── Chat message (text / image / video / voice / file) ────────────────────────
  socket.on('chatMessage', ({ roomId, message, replyTo, image, video, voice, file }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (!message?.trim() && !image && !video && !voice && !file) return

    // Check channel permission: only admins can post in channels
    if (room.type === 'channel') {
      const role = room.memberRoles?.get(currentUser.id)
      if (role !== 'admin' && room.createdBy !== currentUser.username) {
        return socket.emit('error', { message: 'Only channel admins can post messages.' })
      }
    }

    // Check if muted by user
    if (room.mutedBy?.has(currentUser.id)) return

    // Run profanity & spam moderation filter on text
    const textRaw = message?.trim() ?? ''
    const { text: filteredText } = moderateText(textRaw)

    const msg = {
      id:        uuid(),
      userId:    currentUser.id,
      username:  currentUser.username,
      color:     currentUser.color,
      text:      filteredText,
      image:     image  ?? null,   // base64
      video:     video  ?? null,   // base64 video
      voice:     voice  ?? null,   // base64 audio
      file:      file   ?? null,   // { name, type, size, data: base64 }
      replyTo:   replyTo ?? null,
      time:      new Date().toISOString(),
      editedAt:  null,
      reactions: {},
      deleted:   false,
      readBy:    [currentUser.id],  // track who has read this
    }

    room.messages.push(msg)
    if (room.messages.length > 300) room.messages.shift()

    io.to(roomId).emit('chatMessage', { roomId, msg: serializeMsg(msg) })
    broadcastLobby()
  })

  // ── Edit message (within 15 min window) ─────────────────────────────────────
  socket.on('editMsg', ({ roomId, msgId, newText }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg || msg.userId !== currentUser.id || msg.deleted) return
    if (Date.now() - new Date(msg.time).getTime() > MSG_EDIT_WINDOW_MS) {
      return socket.emit('error', { message: 'Edit window expired (15 min).' })
    }
    msg.text     = newText.trim()
    msg.editedAt = new Date().toISOString()
    io.to(roomId).emit('msgEdited', { roomId, msgId, newText: msg.text, editedAt: msg.editedAt })
  })

  // ── Delete message ──────────────────────────────────────────────────────────
  socket.on('deleteMsg', ({ roomId, msgId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg  = room.messages.find((m) => m.id === msgId)
    const role = room.memberRoles?.get(currentUser.id)
    if (!msg) return
    // Can delete own message OR admins can delete any
    if (msg.userId !== currentUser.id && role !== 'admin') return
    msg.deleted = true; msg.text = ''; msg.image = null; msg.voice = null; msg.file = null
    io.to(roomId).emit('msgDeleted', { roomId, msgId })
  })

  // ── Read receipt ─────────────────────────────────────────────────────────────
  socket.on('markRead', ({ roomId, msgId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg) return
    if (!msg.readBy) msg.readBy = []
    if (!msg.readBy.includes(currentUser.id)) {
      msg.readBy.push(currentUser.id)
      io.to(roomId).emit('readReceipt', { roomId, msgId, userId: currentUser.id })
    }
  })

  // ── React ────────────────────────────────────────────────────────────────────
  socket.on('react', ({ roomId, msgId, emoji }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg || msg.deleted) return
    if (!msg.reactions[emoji]) msg.reactions[emoji] = new Set()
    const set = msg.reactions[emoji]
    if (set.has(currentUser.id)) set.delete(currentUser.id)
    else set.add(currentUser.id)
    if (set.size === 0) delete msg.reactions[emoji]
    io.to(roomId).emit('reactionUpdate', { roomId, msgId, reactions: serializeReactions(msg.reactions) })
  })

  // ── Pin ──────────────────────────────────────────────────────────────────────
  socket.on('pinMsg', ({ roomId, msgId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg) return
    room.pinnedMsg = msg.deleted ? null : { id: msg.id, text: msg.text, username: msg.username }
    io.to(roomId).emit('pinnedMsg', { roomId, pin: room.pinnedMsg })
  })

  // ── Typing ───────────────────────────────────────────────────────────────────
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { roomId, username: currentUser.username, isTyping })
  })

  // ── Create room or channel ──────────────────────────────────────────────────
  socket.on('createRoom', ({ name, description, isPrivate, type }) => {
    if (!name?.trim() || name.length < 2 || name.length > 30) return
    const roomId     = uuid().slice(0, 8)
    const inviteCode = uuid().slice(0, 6).toUpperCase()
    const roomType   = type === 'channel' ? 'channel' : 'group'
    const room = {
      id:          roomId,
      name:        name.trim(),
      description: description?.trim() ?? '',
      type:        roomType,
      isPrivate:   isPrivate ?? false,
      inviteCode,
      createdBy:   currentUser.username,
      members:     new Set(),
      memberRoles: new Map([[currentUser.id, 'admin']]),
      messages:    [],
      mutedBy:     new Set(),
    }
    rooms.set(roomId, room)
    broadcastLobby()
    socket.emit('roomCreated', { room: { id: room.id, name: room.name, type: room.type, createdBy: room.createdBy, inviteCode } })
  })

  // ── Join via invite code ──────────────────────────────────────────────────────
  socket.on('joinByInvite', ({ code }) => {
    for (const room of rooms.values()) {
      if (room.inviteCode === code?.toUpperCase()) {
        return socket.emit('inviteResolved', { roomId: room.id, roomName: room.name })
      }
    }
    socket.emit('error', { message: 'Invalid invite code.' })
  })

  // ── Start DM ─────────────────────────────────────────────────────────────────
  socket.on('startDM', ({ targetId, targetUsername }) => {
    if (!targetId) return
    const dmKey = [currentUser.id, targetId].sort().join(':')
    for (const r of rooms.values()) {
      if (r.type === 'dm' && r.dmKey === dmKey) return socket.emit('dmCreated', { roomId: r.id })
    }
    const roomId = uuid().slice(0, 8)
    rooms.set(roomId, {
      id: roomId, name: `${currentUser.username} & ${targetUsername}`,
      type: 'dm', dmKey, createdBy: currentUser.id,
      members: new Set(), memberRoles: new Map(), messages: [], mutedBy: new Set(),
    })
    broadcastLobby()
    socket.emit('dmCreated', { roomId })
  })

  // ── Delete room ───────────────────────────────────────────────────────────────
  socket.on('deleteRoom', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room || room.createdBy !== currentUser.username) return
    io.to(roomId).emit('roomDeleted', { roomId })
    rooms.delete(roomId)
    broadcastLobby()
  })

  // ── Kick member (admin only) ──────────────────────────────────────────────────
  socket.on('kickMember', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const myRole = room.memberRoles?.get(currentUser.id)
    if (myRole !== 'admin') return socket.emit('error', { message: 'Only admins can kick members.' })
    room.members.delete(targetUserId)
    room.memberRoles?.delete(targetUserId)
    io.to(roomId).emit('memberKicked', { roomId, userId: targetUserId })
    broadcastLobby()
  })

  // ── Promote member to admin ────────────────────────────────────────────────
  socket.on('promoteAdmin', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId)
    if (!room || room.createdBy !== currentUser.username) return
    room.memberRoles?.set(targetUserId, 'admin')
    io.to(roomId).emit('roleChanged', { roomId, userId: targetUserId, role: 'admin' })
  })

  // ── Mute room (for current user) ──────────────────────────────────────────────
  socket.on('muteRoom', ({ roomId, mute }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (!room.mutedBy) room.mutedBy = new Set()
    if (mute) room.mutedBy.add(currentUser.id)
    else room.mutedBy.delete(currentUser.id)
    socket.emit('roomMuted', { roomId, muted: mute })
  })

  // ── Leave / disconnect ────────────────────────────────────────────────────────
  socket.on('leaveRoom', ({ roomId }) => leaveRoom(roomId))
  socket.on('disconnect', () => {
    if (currentRoom) leaveRoom(currentRoom)
    try { updateLastSeen(currentUser.id) } catch (_) {}
  })

  function leaveRoom(roomId) {
    const room = rooms.get(roomId)
    if (!room) return
    room.members.delete(currentUser.id)
    socket.leave(roomId)
    sockets.delete(socket.id)
    currentRoom = null
    socket.to(roomId).emit('userLeft', { username: currentUser.username, memberCount: room.members.size })
    broadcastLobby()
  }
}
