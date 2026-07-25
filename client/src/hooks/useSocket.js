import { useEffect } from 'react'
import socket, { connectSocket, disconnectSocket } from '../lib/socket'
import { useAuthStore } from '../store/useAuthStore'
import { useChatStore } from '../store/useChatStore'

export function useSocket() {
  const { user, accessToken } = useAuthStore()
  const {
    setRooms, setOnlineUsers, addRoom, removeRoom,
    addMessage, updateMessage, setTyping, updateReactions, setPinned,
  } = useChatStore()

  useEffect(() => {
    if (!user || !accessToken) return

    connectSocket(accessToken)

    socket.on('lobbyUpdate', ({ rooms, onlineUsers }) => {
      setRooms(rooms)
      setOnlineUsers((onlineUsers || []).filter((u) => u.id !== user.id))
    })

    socket.on('chatMessage', ({ roomId, msg }) => addMessage(roomId, msg))

    socket.on('msgDeleted', ({ roomId, msgId }) =>
      updateMessage(roomId, msgId, { deleted: true, text: '', image: null })
    )

    socket.on('reactionUpdate', ({ roomId, msgId, reactions }) =>
      updateReactions(roomId, msgId, reactions)
    )

    socket.on('typing', ({ roomId, username, isTyping }) =>
      setTyping(roomId, username, isTyping)
    )

    socket.on('pinnedMsg', ({ roomId, pin }) => setPinned(roomId, pin))

    socket.on('roomDeleted', ({ roomId }) => removeRoom(roomId))

    return () => {
      socket.off('lobbyUpdate')
      socket.off('chatMessage')
      socket.off('msgDeleted')
      socket.off('reactionUpdate')
      socket.off('typing')
      socket.off('pinnedMsg')
      socket.off('roomDeleted')
      disconnectSocket()
    }
  }, [user, accessToken])
}
