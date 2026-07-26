import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { findById, updateProfile, safeUser } from '../lib/userRepository.js'
import { generateAccessToken } from '../lib/jwt.js'
import { users } from '../lib/store.js'
import { broadcastLobby } from '../lib/broadcast.js'

const router = Router()

// ── Get own profile ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = findById(req.user.id)
  res.json(safeUser(user))
})

// ── Update profile (bio, status, color, avatar, privacy) ─────────────────────
router.patch('/me', requireAuth, (req, res) => {
  const { bio, status_text, color, avatar, privacy_last_seen, privacy_profile, read_receipts_enabled } = req.body
  const updated = updateProfile(req.user.id, { bio, status_text, color, avatar, privacy_last_seen, privacy_profile, read_receipts_enabled })
  if (!updated) return res.status(404).json({ error: 'User not found' })

  const safe = safeUser(updated)

  // Update in-memory online users map so other sockets see new color/status/avatar
  for (const [sid, u] of users.entries()) {
    if (u.id === req.user.id) {
      users.set(sid, { ...u, color: safe.color, bio: safe.bio, status_text: safe.status_text, avatar: safe.avatar })
    }
  }
  broadcastLobby()

  // Issue new access token with updated details
  const newToken = generateAccessToken(safe)
  res.json({ user: safe, accessToken: newToken })
})

// ── Get any user's public profile ─────────────────────────────────────────────
router.get('/:userId', requireAuth, (req, res) => {
  const user = findById(req.params.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const { password, google_id, email, ...pub } = safeUser(user)
  res.json(pub)
})

export default router
