import { io } from 'socket.io-client'

// Socket is created once. Auth token is set before connecting.
const socket = io({ autoConnect: false })

export function connectSocket(accessToken) {
  socket.auth = { token: accessToken }
  if (!socket.connected) socket.connect()
}

export function disconnectSocket() {
  socket.disconnect()
}

export default socket
