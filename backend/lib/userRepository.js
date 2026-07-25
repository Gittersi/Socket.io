/**
 * All DB operations for the users table.
 * Keeps auth routes clean.
 */
import { getDB, persist } from './db.js'
import { v4 as uuid }     from 'uuid'
import { colorFor }       from './colors.js'

function rowToUser(row) {
  if (!row) return null
  const [id, username, email, password, color, avatar, provider, google_id, created_at, updated_at] = row
  return { id, username, email, password, color, avatar, provider, google_id, created_at, updated_at }
}

export function findById(id) {
  const db  = getDB()
  const res = db.exec(`SELECT * FROM users WHERE id = ?`, [id])
  return rowToUser(res[0]?.values[0])
}

export function findByUsername(username) {
  const db  = getDB()
  const res = db.exec(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`, [username])
  return rowToUser(res[0]?.values[0])
}

export function findByEmail(email) {
  const db  = getDB()
  const res = db.exec(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email])
  return rowToUser(res[0]?.values[0])
}

export function findByGoogleId(googleId) {
  const db  = getDB()
  const res = db.exec(`SELECT * FROM users WHERE google_id = ?`, [googleId])
  return rowToUser(res[0]?.values[0])
}

export function createLocalUser({ username, email, hashedPassword }) {
  const db   = getDB()
  const id   = uuid()
  const now  = Date.now()
  const color = colorFor(username)

  db.run(
    `INSERT INTO users (id, username, email, password, color, provider, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'local', ?, ?)`,
    [id, username, email || null, hashedPassword, color, now, now]
  )
  persist()
  return findById(id)
}

export function createGoogleUser({ googleId, username, email, avatar }) {
  const db    = getDB()
  const id    = uuid()
  const now   = Date.now()
  const color = colorFor(username)

  db.run(
    `INSERT INTO users (id, username, email, color, avatar, provider, google_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'google', ?, ?, ?)`,
    [id, username, email || null, color, avatar || null, googleId, now, now]
  )
  persist()
  return findById(id)
}

export function updateGoogleUser(id, { avatar, email }) {
  const db = getDB()
  db.run(
    `UPDATE users SET avatar = ?, email = ?, updated_at = ? WHERE id = ?`,
    [avatar || null, email || null, Date.now(), id]
  )
  persist()
  return findById(id)
}

export function safeUser(user) {
  if (!user) return null
  // Never expose hashed password to client
  const { password, google_id, ...safe } = user
  return safe
}
