import { rooms, users } from './store.js'
import { roomPublicData } from './store.js'

let _io = null

export function initBroadcast(io) {
  _io = io
}

export function broadcastLobby() {
  if (!_io) return
  _io.emit('lobbyUpdate', {
    rooms:       Array.from(rooms.values()).map(roomPublicData),
    onlineUsers: Array.from(users.values()),
    onlineCount: users.size,
  })
}
