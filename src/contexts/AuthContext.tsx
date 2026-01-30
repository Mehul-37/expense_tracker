import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores'
import { authService } from '@/services/supabase'
import type { User, UserPreferences } from '@/types'

interface AuthContextType {
  user: User | null
  preferences: UserPreferences | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    preferences,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    setUser,
    setPreferences,
    setLoading,
    setInitialized,
    setError,
    logout: clearAuth,
  } = useAuthStore()

  // Listen to auth state changes
  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      // Load theme from localStorage or default to 'light'
      const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light'

      // Apply theme to document
      document.documentElement.setAttribute('data-theme', savedTheme)

      // Check for demo mode first
      const isDemoMode = localStorage.getItem('demo-mode') === 'true'
      const demoUserStr = localStorage.getItem('demo-user')

      if (isDemoMode && demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr)
          setUser(demoUser)
          setPreferences({
            theme: savedTheme,
            currency: 'INR',
            notifications: true,
            language: 'en',
          })
          setLoading(false)
          setInitialized(true)
          return
        } catch {
          // Invalid demo user, clear and continue
          localStorage.removeItem('demo-mode')
          localStorage.removeItem('demo-user')
        }
      }

      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        setPreferences({
          theme: savedTheme,
          currency: 'INR',
          notifications: true,
          language: 'en',
        })
      }
      setLoading(false)
      setInitialized(true)
    }

    initAuth()

    // Listen to auth changes
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser(authUser)
        setPreferences({
          theme: 'dark',
          currency: 'INR',
          notifications: true,
          language: 'en',
        })
      } else {
        setUser(null)
        setPreferences(null)
      }
      setLoading(false)
      setInitialized(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setPreferences, setLoading, setInitialized])

  // Apply theme changes
  useEffect(() => {
    if (preferences?.theme) {
      document.documentElement.setAttribute('data-theme', preferences.theme)
    }
  }, [preferences?.theme])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await authService.login(email, password)
      if (result.error) {
        throw new Error(result.error)
      }
      if (result.user) {
        setUser(result.user)
        setPreferences({
          theme: 'dark',
          currency: 'INR',
          notifications: true,
          language: 'en',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await authService.loginWithGoogle()
      if (result.error) {
        throw new Error(result.error)
      }
      // OAuth redirects, so user will be set by onAuthStateChange
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await authService.register(email, password, displayName)
      if (result.error) {
        throw new Error(result.error)
      }
      if (result.user) {
        setUser(result.user)
        setPreferences({
          theme: 'dark',
          currency: 'INR',
          notifications: true,
          language: 'en',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      // Clear demo mode if active
      localStorage.removeItem('demo-mode')
      localStorage.removeItem('demo-user')

      const result = await authService.logout()
      if (result.error) {
        throw new Error(result.error)
      }
      clearAuth()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return
    try {
      const result = await authService.updateProfile(user.id, updates)
      if (result.error) {
        throw new Error(result.error)
      }
      setUser({ ...user, ...updates })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      setError(message)
      throw err
    }
  }

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!preferences) return
    try {
      setPreferences({ ...preferences, ...newPrefs })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      setError(message)
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
