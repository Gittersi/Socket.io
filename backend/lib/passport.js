import passport        from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as GoogleStrategy }          from 'passport-google-oauth20'
import { findById, findByGoogleId, createGoogleUser, updateGoogleUser, safeUser } from './userRepository.js'

const ACCESS_SECRET   = process.env.JWT_ACCESS_SECRET  || 'access-secret-change-in-prod'
const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const CLIENT_ORIGIN        = process.env.CLIENT_ORIGIN        || 'http://localhost:5173'

// ── JWT Strategy (protects API routes) ───────────────────────────────────────
passport.use('jwt', new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey:    ACCESS_SECRET,
  },
  (payload, done) => {
    const user = findById(payload.sub)
    if (!user) return done(null, false)
    done(null, safeUser(user))
  }
))

// ── Google OAuth Strategy ─────────────────────────────────────────────────────
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use('google', new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  `http://localhost:${process.env.PORT || 3000}/api/auth/google/callback`,
      scope:        ['profile', 'email'],
    },
    (_accessToken, _refreshToken, profile, done) => {
      try {
        const email    = profile.emails?.[0]?.value
        const avatar   = profile.photos?.[0]?.value
        const googleId = profile.id

        // Check if user already exists via Google ID
        let user = findByGoogleId(googleId)

        if (user) {
          // Update avatar/email in case they changed
          user = updateGoogleUser(user.id, { avatar, email })
        } else {
          // New Google user — create account
          // Build a unique username from display name
          let base = (profile.displayName || email?.split('@')[0] || 'user')
            .replace(/\s+/g, '_')
            .slice(0, 18)

          user = createGoogleUser({ googleId, username: base, email, avatar })
        }

        done(null, safeUser(user))
      } catch (err) {
        done(err)
      }
    }
  ))
} else {
  console.warn('[auth] Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')
}

export default passport
