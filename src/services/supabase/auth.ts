import { supabase } from './config'
import type { User } from '@/types'

export interface AuthResponse {
  user: User | null
  error: string | null
}

export const authService = {
  // Register with email and password
  async register(email: string, password: string, displayName: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Create user profile in users table
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: displayName,
        })

        if (profileError) throw profileError

        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            displayName,
            createdAt: new Date().toISOString(),
          },
          error: null,
        }
      }

      return { user: null, error: 'Registration failed' }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Registration failed',
      }
    }
  },

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            displayName: profile?.display_name || data.user.email!.split('@')[0],
            avatarUrl: profile?.avatar_url || undefined,
            phone: profile?.phone || undefined,
            upiId: profile?.upi_id || undefined,
            createdAt: profile?.created_at || new Date().toISOString(),
          },
          error: null,
        }
      }

      return { user: null, error: 'Login failed' }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  },

  // Login with Google
  async loginWithGoogle(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Google login failed',
      }
    }
  },

  // Logout
  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Logout failed',
      }
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return null

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      return {
        id: user.id,
        email: user.email!,
        displayName: profile?.display_name || user.email!.split('@')[0],
        avatarUrl: profile?.avatar_url || undefined,
        phone: profile?.phone || undefined,
        upiId: profile?.upi_id || undefined,
        createdAt: profile?.created_at || new Date().toISOString(),
      }
    } catch {
      return null
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<User>): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: updates.displayName,
          avatar_url: updates.avatarUrl,
          phone: updates.phone,
          upi_id: updates.upiId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Update failed',
      }
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch or create user profile
        let { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        // If no profile exists (e.g., Google OAuth), create one
        if (!profile) {
          const { data: newProfile } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              display_name: session.user.user_metadata?.display_name ||
                           session.user.user_metadata?.full_name ||
                           session.user.email!.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url,
            })
            .select()
            .single()
          profile = newProfile
        }

        callback({
          id: session.user.id,
          email: session.user.email!,
          displayName: profile?.display_name || session.user.email!.split('@')[0],
          avatarUrl: profile?.avatar_url || undefined,
          phone: profile?.phone || undefined,
          upiId: profile?.upi_id || undefined,
          createdAt: profile?.created_at || new Date().toISOString(),
        })
      } else if (event === 'SIGNED_OUT') {
        callback(null)
      }
    })
  },
}
