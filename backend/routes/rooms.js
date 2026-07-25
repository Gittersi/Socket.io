import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { rooms, users, roomPublicData } from '../lib/store.js'
import { broadcastLobby } from '../lib/broadcast.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const auth = requireAuth

// ── List all rooms ────────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  res.json(Array.from(rooms.values()).map(roomPublicData))
})

// ── Create group room ─────────────────────────────────────────────────────────
router.post('/', auth, (req, res) => {
  const name = req.body.name?.trim()
  if (!name || name.length < 2 || name.length > 30) {
    return res.status(400).json({ error: 'Room name must be 2–30 characters.' })
  }

  const roomId = uuid().slice(0, 8)
  const room = {
    id:        roomId,
    name,
    type:      'group',
    createdBy: req.session.user.username,
    members:   new Set(),
    messages:  [],
  }
  rooms.set(roomId, room)
  broadcastLobby()

  res.status(201).json(roomPublicData(room))
})

// ── Delete room (creator only) ────────────────────────────────────────────────
router.delete('/:roomId', auth, (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'Room not found.' })
  if (room.createdBy !== req.session.user.username) {
    return res.status(403).json({ error: 'Only the creator can delete this room.' })
  }
  rooms.delete(req.params.roomId)
  broadcastLobby()
  res.json({ ok: true })
})

// ── Get room messages ─────────────────────────────────────────────────────────
router.get('/:roomId/messages', auth, (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'Room not found.' })
  res.json(room.messages.slice(-80))
})

// ── Start or get existing DM ──────────────────────────────────────────────────
router.post('/dm', auth, (req, res) => {
  const me       = req.session.user
  const targetId = req.body.targetId

  // Find target user
  let targetUser = null
  for (const u of users.values()) {
    if (u.id === targetId) { targetUser = u; break }
  }
  if (!targetUser) return res.status(404).json({ error: 'User not found.' })

  // Return existing DM room if it already exists
  const dmKey = [me.id, targetId].sort().join(':')
  for (const r of rooms.values()) {
    if (r.type === 'dm' && r.dmKey === dmKey) {
      return res.json(roomPublicData(r))
    }
  }

  // Create new DM room
  const roomId = uuid().slice(0, 8)
  const room = {
    id:        roomId,
    name:      `${me.username} & ${targetUser.username}`,
    type:      'dm',
    dmKey,
    createdBy: me.id,
    members:   new Set(),
    messages:  [],
  }
  rooms.set(roomId, room)
  broadcastLobby()

  res.status(201).json(roomPublicData(room))
})

export default router
