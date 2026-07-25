import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { getDB, persist } from './db.js'

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'access-secret-change-in-prod'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-prod'
const ACCESS_TTL     = '15m'   // short-lived
const REFRESH_TTL    = '7d'    // long-lived

// ── Generate tokens ───────────────────────────────────────────────────────────
export function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, color: user.color },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  )
}

export function generateRefreshToken(userId) {
  const token    = jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TTL })
  const decoded  = jwt.decode(token)
  const db       = getDB()

  db.run(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid(), userId, token, decoded.exp * 1000, Date.now()]
  )
  persist()
  return token
}

// ── Verify tokens ─────────────────────────────────────────────────────────────
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET)   // throws if invalid/expired
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, REFRESH_SECRET)  // throws if invalid
  const db      = getDB()

  // Check it's in our DB (not revoked)
  const row = db.exec(
    `SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > ?`,
    [token, Date.now()]
  )
  if (!row.length || !row[0].values.length) {
    throw new Error('Refresh token revoked or expired')
  }
  return payload
}

// ── Revoke refresh token (logout) ─────────────────────────────────────────────
export function revokeRefreshToken(token) {
  const db = getDB()
  db.run(`DELETE FROM refresh_tokens WHERE token = ?`, [token])
  persist()
}

// ── Revoke all refresh tokens for a user ──────────────────────────────────────
export function revokeAllUserTokens(userId) {
  const db = getDB()
  db.run(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId])
  persist()
}

// ── Clean expired tokens (call periodically) ──────────────────────────────────
export function cleanExpiredTokens() {
  const db = getDB()
  db.run(`DELETE FROM refresh_tokens WHERE expires_at < ?`, [Date.now()])
  persist()
}
