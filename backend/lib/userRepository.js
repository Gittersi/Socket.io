import { getDB, persist } from './db.js'
import { v4 as uuid }     from 'uuid'
import { colorFor }       from './colors.js'

function rowToUser(row) {
  if (!row) return null
  const [
    id, username, email, password, color, avatar, bio, status_text,
    privacy_last_seen, privacy_profile, read_receipts_enabled,
    two_factor_enabled, two_factor_secret, role,
    provider, google_id, last_seen, created_at, updated_at
  ] = row
  return {
    id, username, email, password, color, avatar, bio, status_text,
    privacy_last_seen: privacy_last_seen || 'everyone',
    privacy_profile: privacy_profile || 'everyone',
    read_receipts_enabled: read_receipts_enabled ?? 1,
    two_factor_enabled: two_factor_enabled ?? 0,
    two_factor_secret: two_factor_secret || null,
    role: role || 'user',
    provider, google_id, last_seen, created_at, updated_at
  }
}

export function findById(id) {
  const db  = getDB()
  const res = db.exec(`SELECT id, username, email, password, color, avatar, bio, status_text, privacy_last_seen, privacy_profile, read_receipts_enabled, two_factor_enabled, two_factor_secret, role, provider, google_id, last_seen, created_at, updated_at FROM users WHERE id = ?`, [id])
  return rowToUser(res[0]?.values[0])
}

export function findByUsername(username) {
  const db  = getDB()
  const res = db.exec(`SELECT id, username, email, password, color, avatar, bio, status_text, privacy_last_seen, privacy_profile, read_receipts_enabled, two_factor_enabled, two_factor_secret, role, provider, google_id, last_seen, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?)`, [username])
  return rowToUser(res[0]?.values[0])
}

export function findByEmail(email) {
  const db  = getDB()
  const res = db.exec(`SELECT id, username, email, password, color, avatar, bio, status_text, privacy_last_seen, privacy_profile, read_receipts_enabled, two_factor_enabled, two_factor_secret, role, provider, google_id, last_seen, created_at, updated_at FROM users WHERE LOWER(email) = LOWER(?)`, [email])
  return rowToUser(res[0]?.values[0])
}

export function findByGoogleId(googleId) {
  const db  = getDB()
  const res = db.exec(`SELECT id, username, email, password, color, avatar, bio, status_text, privacy_last_seen, privacy_profile, read_receipts_enabled, two_factor_enabled, two_factor_secret, role, provider, google_id, last_seen, created_at, updated_at FROM users WHERE google_id = ?`, [googleId])
  return rowToUser(res[0]?.values[0])
}

export function createLocalUser({ username, email, hashedPassword }) {
  const db  = getDB()
  const id  = uuid()
  const now = Date.now()
  db.run(
    `INSERT INTO users (id,username,email,password,color,provider,last_seen,created_at,updated_at)
     VALUES (?,?,?,?,?,'local',?,?,?)`,
    [id, username, email||null, hashedPassword, colorFor(username), now, now, now]
  )
  persist()
  return findById(id)
}

export function createGoogleUser({ googleId, username, email, avatar }) {
  const db  = getDB()
  const id  = uuid()
  const now = Date.now()
  db.run(
    `INSERT INTO users (id,username,email,color,avatar,provider,google_id,last_seen,created_at,updated_at)
     VALUES (?,?,?,?,?,'google',?,?,?,?)`,
    [id, username, email||null, colorFor(username), avatar||null, googleId, now, now, now]
  )
  persist()
  return findById(id)
}

export function updateGoogleUser(id, { avatar, email }) {
  const db = getDB()
  db.run(`UPDATE users SET avatar=?,email=?,updated_at=? WHERE id=?`, [avatar||null, email||null, Date.now(), id])
  persist()
  return findById(id)
}

export function updateProfile(id, { bio, status_text, color, avatar, privacy_last_seen, privacy_profile, read_receipts_enabled }) {
  const db = getDB()
  const existing = findById(id)
  if (!existing) return null

  const newBio      = bio !== undefined ? bio : existing.bio
  const newStatus   = status_text !== undefined ? status_text : existing.status_text
  const newColor    = color !== undefined ? color : existing.color
  const newAvatar   = avatar !== undefined ? avatar : existing.avatar
  const newLastSeenPriv = privacy_last_seen !== undefined ? privacy_last_seen : existing.privacy_last_seen
  const newProfPriv     = privacy_profile !== undefined ? privacy_profile : existing.privacy_profile
  const newReadReceipts = read_receipts_enabled !== undefined ? (read_receipts_enabled ? 1 : 0) : existing.read_receipts_enabled

  db.run(
    `UPDATE users SET bio=?, status_text=?, color=?, avatar=?, privacy_last_seen=?, privacy_profile=?, read_receipts_enabled=?, updated_at=? WHERE id=?`,
    [newBio, newStatus, newColor, newAvatar, newLastSeenPriv, newProfPriv, newReadReceipts, Date.now(), id]
  )
  persist()
  return findById(id)
}

export function updateTwoFactor(id, { enabled, secret }) {
  const db = getDB()
  db.run(`UPDATE users SET two_factor_enabled=?, two_factor_secret=?, updated_at=? WHERE id=?`, [enabled ? 1 : 0, secret || null, Date.now(), id])
  persist()
  return findById(id)
}

export function updateLastSeen(id) {
  const db = getDB()
  db.run(`UPDATE users SET last_seen=? WHERE id=?`, [Date.now(), id])
  persist()
}

export function safeUser(user) {
  if (!user) return null
  const { password, google_id, two_factor_secret, ...safe } = user
  return safe
}
