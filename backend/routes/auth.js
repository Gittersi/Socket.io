import { Router }   from 'express'
import bcrypt        from 'bcryptjs'
import passport      from '../lib/passport.js'
import {
  findByUsername, findByEmail, createLocalUser, safeUser, updateTwoFactor
} from '../lib/userRepository.js'
import {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, revokeRefreshToken
} from '../lib/jwt.js'

const router = Router()
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

// ─── Helper: send both tokens ─────────────────────────────────────────────────
function sendTokens(res, user) {
  const accessToken  = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user.id)

  // Refresh token in httpOnly cookie — never readable by JS
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
  })

  res.json({ accessToken, user: safeUser(user) })
}

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validate
    if (!username?.trim() || username.trim().length < 2 || username.trim().length > 20) {
      return res.status(400).json({ error: 'Username must be 2–20 characters.' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    // Check username uniqueness
    if (findByUsername(username.trim())) {
      return res.status(409).json({ error: 'Username already taken.' })
    }

    // Check email uniqueness (optional field)
    if (email && findByEmail(email.trim())) {
      return res.status(409).json({ error: 'Email already registered.' })
    }

    // Hash password (salt rounds = 12)
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = createLocalUser({
      username:       username.trim(),
      email:          email?.trim() || null,
      hashedPassword,
    })

    sendTokens(res, user)
  } catch (err) {
    console.error('[auth] register error:', err)
    res.status(500).json({ error: 'Server error during registration.' })
  }
})

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required.' })
    }

    const user = findByUsername(username.trim())
    if (!user || user.provider !== 'local') {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    sendTokens(res, user)
  } catch (err) {
    console.error('[auth] login error:', err)
    res.status(500).json({ error: 'Server error during login.' })
  }
})

// ─── Refresh access token ─────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ error: 'No refresh token.' })

    const payload    = verifyRefreshToken(token)  // throws if invalid
    const accessToken = generateAccessToken({ id: payload.sub, ...payload })

    res.json({ accessToken })
  } catch (err) {
    res.clearCookie('refreshToken')
    res.status(401).json({ error: 'Refresh token invalid or expired. Please log in again.' })
  }
})

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = req.cookies?.refreshToken
  if (token) revokeRefreshToken(token)
  res.clearCookie('refreshToken')
  res.json({ ok: true })
})

// ─── Get current user (JWT protected) ────────────────────────────────────────
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user })
})

// ─── Set refresh token cookie (used after Google OAuth redirect) ──────────────
// The Google OAuth flow passes the refresh token in the URL fragment to the client.
// The client then POSTs it here (via the Vite proxy) so it's set as an httpOnly cookie
// on the correct origin.
router.post('/set-refresh-cookie', (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
  })
  res.json({ ok: true })
})

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${CLIENT_ORIGIN}/login?error=google_not_configured`)
  }
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })(req, res, next)
})

router.get('/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${CLIENT_ORIGIN}/login?error=google_not_configured`)
  }
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_ORIGIN}/login?error=google` }, (err, user) => {
    if (err || !user) {
      console.error('[auth] Google OAuth callback error:', err)
      return res.redirect(`${CLIENT_ORIGIN}/login?error=google`)
    }
    const accessToken  = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user.id)

    // Encode user + tokens as base64 so the client can parse them from the URL fragment
    const payload = Buffer.from(JSON.stringify({
      accessToken,
      refreshToken,
      user: safeUser(user),
    })).toString('base64url')

    // Use URL fragment (#) — it's never sent to the server, so it's safer than query params
    res.redirect(`${CLIENT_ORIGIN}/auth/callback#data=${payload}`)
  })(req, res, next)
})

// ─── 2FA Setup & Verification ────────────────────────────────────────────────
router.post('/2fa/setup', passport.authenticate('jwt', { session: false }), (req, res) => {
  const secret = '2FA_' + Math.random().toString(36).substring(2, 10).toUpperCase()
  res.json({ secret, qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/ChatApp:${req.user.username}?secret=${secret}` })
})

router.post('/2fa/verify', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { secret, code } = req.body
  if (!code || code.length !== 6) return res.status(400).json({ error: 'Code must be 6 digits.' })
  updateTwoFactor(req.user.id, { enabled: true, secret })
  res.json({ ok: true, message: '2FA enabled successfully' })
})

router.post('/2fa/disable', passport.authenticate('jwt', { session: false }), (req, res) => {
  updateTwoFactor(req.user.id, { enabled: false, secret: null })
  res.json({ ok: true, message: '2FA disabled successfully' })
})

// ─── Content Moderation Report & Admin Panel ──────────────────────────────────
router.post('/report', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { msgId, roomId, reason, msgText, username } = req.body
  import('../lib/moderation.js').then(({ reportMessage }) => {
    const report = reportMessage({ msgId, roomId, reportedBy: req.user.username, reason, msgText, username })
    res.json({ ok: true, report })
  })
})

router.get('/admin/reports', passport.authenticate('jwt', { session: false }), (req, res) => {
  import('../lib/moderation.js').then(({ reportedMessages }) => {
    res.json({ reports: reportedMessages })
  })
})

export default router
