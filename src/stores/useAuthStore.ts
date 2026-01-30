import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserPreferences } from '@/types'

interface AuthState {
  user: User | null
  preferences: UserPreferences | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setPreferences: (preferences: UserPreferences | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

const initialPreferences: UserPreferences = {
  currency: 'INR',
  theme: 'dark',
  language: 'en',
  notifications: true,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      preferences: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setPreferences: (preferences) =>
        set({ preferences: preferences || initialPreferences }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () =>
        set({
          user: null,
          preferences: null,
          isAuthenticated: false,
          error: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
