import { create } from 'zustand'

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('chatapp_theme') || 'dark', // 'dark' | 'glass' | 'light'
  setTheme: (theme) => {
    localStorage.setItem('chatapp_theme', theme)
    set({ theme })
  }
}))
