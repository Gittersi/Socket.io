import { v4 as uuid } from 'uuid'
import { rooms, sockets, serializeMsg, serializeReactions } from '../lib/store.js'
import { broadcastLobby } from '../lib/broadcast.js'

export function registerChatHandlers(io, socket) {
  // User info comes from socket.data (set during auth middleware)
  const currentUser = socket.data.user
  let currentRoom   = null

  if (!currentUser) {
    socket.disconnect(true)
    return
  }

  // ── Join room ───────────────────────────────────────────────────────────────
  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return

    // Leave previous room if any
    if (currentRoom && currentRoom !== roomId) {
      leaveRoom(currentRoom)
    }

    currentRoom = roomId
    socket.join(roomId)
    room.members.add(currentUser.id)
    sockets.set(socket.id, { userId: currentUser.id, roomId })

    // Send history + member count to joining socket
    socket.emit('roomHistory', {
      roomId,
      messages:    room.messages.slice(-80).map(serializeMsg),
      memberCount: room.members.size,
      pinnedMsg:   room.pinnedMsg ?? null,
    })

    // Notify others in room
    socket.to(roomId).emit('userJoined', {
      user:        currentUser,
      memberCount: room.members.size,
    })

    broadcastLobby()
  })

  // ── Chat message ────────────────────────────────────────────────────────────
  socket.on('chatMessage', ({ roomId, message, replyTo, image }) => {
    const room = rooms.get(roomId)
    if (!room) return
    if (!message?.trim() && !image) return

    const msg = {
      id:        uuid(),
      userId:    currentUser.id,
      username:  currentUser.username,
      color:     currentUser.color,
      text:      message?.trim() ?? '',
      image:     image ?? null,
      replyTo:   replyTo ?? null,
      time:      new Date().toISOString(),
      reactions: {},
      deleted:   false,
    }

    room.messages.push(msg)
    if (room.messages.length > 300) room.messages.shift()

    io.to(roomId).emit('chatMessage', { roomId, msg: serializeMsg(msg) })
    broadcastLobby()
  })

  // ── React to message ────────────────────────────────────────────────────────
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

    io.to(roomId).emit('reactionUpdate', {
      roomId,
      msgId,
      reactions: serializeReactions(msg.reactions),
    })
  })

  // ── Delete message ──────────────────────────────────────────────────────────
  socket.on('deleteMsg', ({ roomId, msgId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg || msg.userId !== currentUser.id) return

    msg.deleted = true
    msg.text    = ''
    msg.image   = null

    io.to(roomId).emit('msgDeleted', { roomId, msgId })
  })

  // ── Pin message ─────────────────────────────────────────────────────────────
  socket.on('pinMsg', ({ roomId, msgId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const msg = room.messages.find((m) => m.id === msgId)
    if (!msg) return

    room.pinnedMsg = msg.deleted
      ? null
      : { id: msg.id, text: msg.text, username: msg.username }

    io.to(roomId).emit('pinnedMsg', { roomId, pin: room.pinnedMsg })
  })

  // ── Typing indicator ────────────────────────────────────────────────────────
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', {
      roomId,
      username: currentUser.username,
      isTyping,
    })
  })

  // ── Create room via socket (for React client) ───────────────────────────────
  socket.on('createRoom', ({ name }) => {
    if (!name?.trim() || name.length < 2 || name.length > 30) return
    const roomId = uuid().slice(0, 8)
    const room = {
      id:        roomId,
      name:      name.trim(),
      type:      'group',
      createdBy: currentUser.username,
      members:   new Set(),
      messages:  [],
    }
    rooms.set(roomId, room)
    broadcastLobby()
    socket.emit('roomCreated', { room: { id: room.id, name: room.name, type: room.type, createdBy: room.createdBy } })
  })

  // ── Start DM via socket ─────────────────────────────────────────────────────
  socket.on('startDM', ({ targetId, targetUsername }) => {
    if (!targetId) return
    const dmKey = [currentUser.id, targetId].sort().join(':')

    // Return existing
    for (const r of rooms.values()) {
      if (r.type === 'dm' && r.dmKey === dmKey) {
        return socket.emit('dmCreated', { roomId: r.id })
      }
    }
    const roomId = uuid().slice(0, 8)
    rooms.set(roomId, {
      id:        roomId,
      name:      `${currentUser.username} & ${targetUsername}`,
      type:      'dm',
      dmKey,
      createdBy: currentUser.id,
      members:   new Set(),
      messages:  [],
    })
    broadcastLobby()
    socket.emit('dmCreated', { roomId })
  })

  // ── Delete room via socket ──────────────────────────────────────────────────
  socket.on('deleteRoom', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room || room.createdBy !== currentUser.username) return
    io.to(roomId).emit('roomDeleted', { roomId })
    rooms.delete(roomId)
    broadcastLobby()
  })

  // ── Leave / disconnect ──────────────────────────────────────────────────────
  socket.on('leaveRoom', ({ roomId }) => leaveRoom(roomId))
  socket.on('disconnect', () => { if (currentRoom) leaveRoom(currentRoom) })

  function leaveRoom(roomId) {
    const room = rooms.get(roomId)
    if (!room) return
    room.members.delete(currentUser.id)
    socket.leave(roomId)
    sockets.delete(socket.id)
    currentRoom = null
    socket.to(roomId).emit('userLeft', {
      username:    currentUser.username,
      memberCount: room.members.size,
    })
    broadcastLobby()
  }
}
