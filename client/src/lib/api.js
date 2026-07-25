/**
 * API client — wraps fetch with auth token injection + auto-refresh
 */
import { useAuthStore } from '../store/useAuthStore'

const BASE = '/api'

async function request(method, path, body) {
  const token = useAuthStore.getState().accessToken

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',   // sends httpOnly refresh token cookie
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  // If access token expired, try to refresh once
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      // Retry with new token
      return request(method, path, body)
    }
    // Refresh failed — log out
    useAuthStore.getState().logout()
    window.location.href = '/login'
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method:      'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const { accessToken } = await res.json()
    useAuthStore.getState().setAccessToken(accessToken)
    return true
  } catch {
    return false
  }
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  delete: (path)        => request('DELETE', path),
}
