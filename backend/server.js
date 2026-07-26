import 'dotenv/config'
import express        from 'express'
import http           from 'http'
import path           from 'path'
import { fileURLToPath } from 'url'
import { Server }     from 'socket.io'
import cors           from 'cors'
import cookieParser   from 'cookie-parser'

import { initDB }     from './lib/db.js'
import passport       from './lib/passport.js'
import { verifyAccessToken } from './lib/jwt.js'
import { cleanExpiredTokens } from './lib/jwt.js'
import { initBroadcast, broadcastLobby } from './lib/broadcast.js'
import { registerChatHandlers }          from './sockets/chat.js'
import { registerCallHandlers }          from './sockets/call.js'
import { users }      from './lib/store.js'

import authRoutes     from './routes/auth.js'
import roomRoutes     from './routes/rooms.js'

const PORT          = process.env.PORT          || 3000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const __dirname     = path.dirname(fileURLToPath(import.meta.url))
const IS_PROD       = process.env.NODE_ENV === 'production'

// ─── Init DB first ────────────────────────────────────────────────────────────
await initDB()

// ─── Clean expired refresh tokens every hour ─────────────────────────────────
setInterval(cleanExpiredTokens, 60 * 60 * 1000)

// ─── App + HTTP server ────────────────────────────────────────────────────────
const app        = express()
const httpServer = http.createServer(app)
const io         = new Server(httpServer, {
  maxHttpBufferSize: 5e6,
  cors: { origin: CLIENT_ORIGIN, credentials: true },
})

initBroadcast(io)

// ─── Express middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(passport.initialize())

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes)
app.use('/api/rooms', roomRoutes)
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

// ─── Serve React frontend in production ───────────────────────────────────────
if (IS_PROD) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(clientDist))
  // SPA fallback: any non-API route serves index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// ─── Socket.IO JWT auth middleware ────────────────────────────────────────────
io.use((socket, next) => {
  // Frontend sends JWT in socket handshake auth
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Unauthorized — no token'))

  try {
    const payload    = verifyAccessToken(token)
    socket.data.user = {
      id:       payload.sub,
      username: payload.username,
      color:    payload.color,
    }
    next()
  } catch {
    next(new Error('Unauthorized — invalid token'))
  }
})

// ─── Socket.IO event handlers ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  const user = socket.data.user
  console.log(`[socket] + ${user.username} (${socket.id})`)

  registerChatHandlers(io, socket)
  registerCallHandlers(io, socket)

  // Track online users (keyed by socketId to handle multiple tabs)
  users.set(socket.id, user)
  broadcastLobby()

  socket.on('disconnect', () => {
    console.log(`[socket] - ${user.username}`)
    users.delete(socket.id)
    broadcastLobby()
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║  ChatApp Backend                     ║
  ║  http://localhost:${PORT}               ║
  ║                                      ║
  ║  Auth:  JWT + bcrypt + Google OAuth  ║
  ║  DB:    SQLite (./data/chatapp.db)   ║
  ║  WS:    socket.io                    ║
  ╚══════════════════════════════════════╝
  `)
})
