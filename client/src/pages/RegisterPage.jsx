import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { api } from '../lib/api'

export default function RegisterPage() {
  const [form, setForm]   = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  function set(field) {
    return (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setError('') }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { user, accessToken } = await api.post('/auth/register', {
        username: form.username.trim(),
        email:    form.email.trim() || undefined,
        password: form.password,
      })
      setAuth(user, accessToken)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-indigo-500/20 blur-[80px] -top-20 -left-20 animate-pulse" />
        <div className="absolute w-72 h-72 rounded-full bg-pink-500/15 blur-[80px] -bottom-10 -right-10 animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#13131a] border border-white/10 rounded-2xl p-10 shadow-2xl">
          <div className="mb-1 text-2xl font-black tracking-tight text-white">
            chat<span className="text-indigo-400">.</span>app
          </div>
          <p className="text-sm text-white/30 mb-8">Create your account</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Username *</label>
              <input type="text" value={form.username} onChange={set('username')} required maxLength={20}
                placeholder="e.g. alex"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Email <span className="normal-case text-white/20">(optional)</span></label>
              <input type="email" value={form.email} onChange={set('email')}
                placeholder="you@example.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Password *</label>
              <input type="password" value={form.password} onChange={set('password')} required minLength={6}
                placeholder="Min 6 characters"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required
                placeholder="Repeat password"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 active:scale-[.98] text-white font-bold rounded-xl py-3 text-[15px] transition-all shadow-lg shadow-indigo-500/25 mt-2">
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          {/* Google OAuth */}
          <div className="mt-4">
            <a href="/api/auth/google"
              className="flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl py-3 text-[14px] transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
          </div>

          <p className="text-center text-xs text-white/25 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
