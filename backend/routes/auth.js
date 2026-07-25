import { Router }   from 'express'
import bcrypt        from 'bcryptjs'
import passport      from '../lib/passport.js'
import {
  findByUsername, findByEmail, createLocalUser, safeUser
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

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_ORIGIN}/login?error=google` }),
  (req, res) => {
    // Issue tokens and redirect to frontend with access token in URL
    // (frontend reads it once and stores it, then clears from URL)
    const accessToken = generateAccessToken(req.user)
    generateRefreshToken(req.user.id)  // sets httpOnly cookie via sendTokens

    res.cookie('refreshToken', generateRefreshToken(req.user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    })

    // Redirect to frontend — token in query param (short-lived, frontend stores it immediately)
    res.redirect(`${CLIENT_ORIGIN}/auth/callback?token=${accessToken}`)
  }
)

export default router
