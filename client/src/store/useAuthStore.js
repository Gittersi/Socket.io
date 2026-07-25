import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),

      logout: () => {
        // Tell backend to revoke refresh token
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
        set({ user: null, accessToken: null })
      },

      isLoggedIn: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'chat-auth',
      // Only persist user profile, NOT the access token (it's short-lived)
      partialize: (state) => ({ user: state.user }),
    }
  )
)
