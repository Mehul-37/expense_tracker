export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  phone?: string
  upiId?: string
  createdAt: string
}

export interface UserPreferences {
  currency: string
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: boolean
}

export interface UserProfile extends User {
  preferences: UserPreferences
}
