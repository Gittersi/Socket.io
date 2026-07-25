/**
 * SQLite persistence using sql.js (pure JS — no native build required)
 * Data is saved to ./data/chatapp.sqlite on every write.
 */
import { createRequire } from 'module'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = path.join(__dirname, '..', 'data')
const DB_FILE   = path.join(DATA_DIR, 'chatapp.sqlite')

// sql.js is CommonJS, so we need createRequire
const require = createRequire(import.meta.url)
const initSqlJs = require('sql.js')

let db = null

export async function initDB() {
  const SQL = await initSqlJs()

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

  // Load existing DB file or create new
  if (existsSync(DB_FILE)) {
    const fileBuffer = readFileSync(DB_FILE)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      email       TEXT UNIQUE,
      password    TEXT,
      color       TEXT NOT NULL,
      avatar      TEXT,
      provider    TEXT NOT NULL DEFAULT 'local',
      google_id   TEXT UNIQUE,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      token       TEXT UNIQUE NOT NULL,
      expires_at  INTEGER NOT NULL,
      created_at  INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  persist()
  console.log('[db] SQLite ready →', DB_FILE)
  return db
}

// Save DB to disk after every write
export function persist() {
  if (!db) return
  const data = db.export()
  writeFileSync(DB_FILE, Buffer.from(data))
}

export function getDB() {
  if (!db) throw new Error('DB not initialized. Call initDB() first.')
  return db
}
