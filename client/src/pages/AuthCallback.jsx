/**
 * Google OAuth lands here: /auth/callback?token=<accessToken>
 * We grab the token, fetch the user profile, store both, then redirect to lobby.
 */
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function AuthCallback() {
  const [params]  = useSearchParams()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const navigate  = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) { navigate('/login'); return }

    // Fetch user profile with the token
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then(({ user }) => {
        setAuth(user, token)
        navigate('/', { replace: true })
      })
      .catch(() => navigate('/login'))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-white/40 text-sm animate-pulse">Signing you in…</div>
    </div>
  )
}
