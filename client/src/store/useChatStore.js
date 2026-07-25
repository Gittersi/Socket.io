import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  rooms: [],
  onlineUsers: [],
  currentRoomId: null,
  messages: {},       // roomId -> msg[]
  typingUsers: {},    // roomId -> Set<username>
  unread: {},         // roomId -> count

  setRooms: (rooms) => set({ rooms }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setCurrentRoom: (id) => {
    set((s) => ({
      currentRoomId: id,
      unread: { ...s.unread, [id]: 0 },
    }))
  },

  addRoom: (room) =>
    set((s) => ({ rooms: [...s.rooms.filter((r) => r.id !== room.id), room] })),

  removeRoom: (id) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),

  setMessages: (roomId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [roomId]: msgs } })),

  addMessage: (roomId, msg) =>
    set((s) => {
      const prev = s.messages[roomId] ?? []
      const isActive = s.currentRoomId === roomId
      return {
        messages: { ...s.messages, [roomId]: [...prev, msg] },
        unread: {
          ...s.unread,
          [roomId]: isActive ? 0 : (s.unread[roomId] ?? 0) + 1,
        },
      }
    }),

  updateMessage: (roomId, msgId, patch) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] ?? []).map((m) =>
          m.id === msgId ? { ...m, ...patch } : m
        ),
      },
    })),

  setTyping: (roomId, username, isTyping) =>
    set((s) => {
      const prev = new Set(s.typingUsers[roomId] ?? [])
      if (isTyping) prev.add(username)
      else prev.delete(username)
      return { typingUsers: { ...s.typingUsers, [roomId]: prev } }
    }),

  updateReactions: (roomId, msgId, reactions) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] ?? []).map((m) =>
          m.id === msgId ? { ...m, reactions } : m
        ),
      },
    })),

  setPinned: (roomId, pin) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, pinnedMsg: pin } : r)),
    })),
}))
