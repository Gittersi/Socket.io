import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { rooms } from '../lib/store.js'
import { users as onlineUsers } from '../lib/store.js'
import { findByUsername } from '../lib/userRepository.js'

const router = Router()

// ── Global search: rooms + messages ──────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const q = req.query.q?.toLowerCase()?.trim()
  if (!q || q.length < 2) return res.json({ rooms: [], messages: [] })

  // Search room names
  const matchedRooms = Array.from(rooms.values())
    .filter((r) => r.type === 'group' && r.name.toLowerCase().includes(q))
    .map((r) => ({ id: r.id, name: r.name, type: r.type, memberCount: r.members.size }))
    .slice(0, 10)

  // Search messages across all rooms
  const matchedMessages = []
  for (const room of rooms.values()) {
    for (const msg of room.messages) {
      if (!msg.deleted && msg.text?.toLowerCase().includes(q)) {
        matchedMessages.push({
          roomId:   room.id,
          roomName: room.name,
          msgId:    msg.id,
          username: msg.username,
          text:     msg.text,
          time:     msg.time,
        })
        if (matchedMessages.length >= 20) break
      }
    }
    if (matchedMessages.length >= 20) break
  }

  res.json({ rooms: matchedRooms, messages: matchedMessages })
})

// ── Search within a specific room ─────────────────────────────────────────────
router.get('/room/:roomId', requireAuth, (req, res) => {
  const q    = req.query.q?.toLowerCase()?.trim()
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  if (!q)    return res.json([])

  const results = room.messages
    .filter((m) => !m.deleted && m.text?.toLowerCase().includes(q))
    .map((m) => ({ id: m.id, username: m.username, text: m.text, time: m.time }))
    .slice(-30)

  res.json(results)
})

export default router
