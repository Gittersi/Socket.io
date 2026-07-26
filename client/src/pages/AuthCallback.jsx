/**
 * Google OAuth lands here: /auth/callback#data=<base64url-encoded JSON>
 * We parse the token + user from the URL fragment, store them, set the
 * refresh token cookie via API, then redirect to lobby.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function AuthCallback() {
  const setAuth  = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      // Parse the fragment: #data=<base64url>
      const hash = window.location.hash.slice(1) // remove '#'
      const params = new URLSearchParams(hash)
      const encoded = params.get('data')

      if (!encoded) {
        console.error('[AuthCallback] No data in URL fragment')
        navigate('/login?error=google', { replace: true })
        return
      }

      // Decode base64url → JSON
      const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
      const { accessToken, refreshToken, user } = JSON.parse(json)

      if (!accessToken || !user) {
        console.error('[AuthCallback] Missing token or user in payload')
        navigate('/login?error=google', { replace: true })
        return
      }

      // Store in Zustand
      setAuth(user, accessToken)

      // Set the refresh token as an httpOnly cookie via the backend
      // We POST the refresh token to a special endpoint that sets the cookie
      fetch('/api/auth/set-refresh-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch((err) => {
        console.warn('[AuthCallback] Failed to set refresh cookie:', err)
      })

      // Clear the hash from the URL (tokens shouldn't linger in browser history)
      window.history.replaceState(null, '', '/auth/callback')

      // Navigate to lobby
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[AuthCallback] Error parsing OAuth data:', err)
      navigate('/login?error=google', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-white/40 text-sm animate-pulse">Signing you in…</div>
    </div>
  )
}
