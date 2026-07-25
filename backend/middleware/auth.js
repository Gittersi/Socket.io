import passport from '../lib/passport.js'

/**
 * Protect a route — requires a valid JWT access token in the
 * Authorization: Bearer <token> header.
 */
export function requireAuth(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err)   return next(err)
    if (!user) return res.status(401).json({ error: 'Unauthorized. Please log in.' })
    req.user = user
    next()
  })(req, res, next)
}
