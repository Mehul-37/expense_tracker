import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Phone,
  CreditCard,
  Bell,
  Moon,
  Globe,
  Shield,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react'
import { authService } from '@/services/supabase/auth'
import { useAuthStore } from '@/stores/useAuthStore'

type EditField = 'profile' | 'upi' | 'phone' | null

export default function Profile() {
  const { user, logout } = useAuth()
  const { preferences, setPreferences } = useAuthStore()
  const [editField, setEditField] = useState<EditField>(null)
  const [editValue, setEditValue] = useState('')
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const openEdit = (field: EditField) => {
    setEditField(field)
    if (field === 'profile') {
      setEditName(user?.displayName || '')
    } else if (field === 'upi') {
      setEditValue(user?.upiId || '')
    } else if (field === 'phone') {
      setEditValue(user?.phone || '')
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      if (editField === 'profile') {
        await authService.updateProfile(user.id, { displayName: editName })
      } else if (editField === 'upi') {
        await authService.updateProfile(user.id, { upiId: editValue })
      } else if (editField === 'phone') {
        await authService.updateProfile(user.id, { phone: editValue })
      }
      // Refresh page to get updated data
      window.location.reload()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
      setEditField(null)
    }
  }

  const toggleNotifications = () => {
    if (!preferences) return
    setPreferences({
      ...preferences,
      notifications: !preferences.notifications,
    })
  }

  const toggleTheme = () => {
    if (!preferences) return
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark'
    setPreferences({
      ...preferences,
      theme: newTheme,
    })
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
    // Persist to localStorage
    localStorage.setItem('theme', newTheme)
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Edit Modal */}
      {editField && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setEditField(null)}
        >
          <div
            className="bg-card rounded-lg p-6 w-[90%] max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editField === 'profile' && 'Edit Profile'}
                {editField === 'upi' && 'Edit UPI ID'}
                {editField === 'phone' && 'Edit Phone Number'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setEditField(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {editField === 'profile' ? (
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  {editField === 'upi' ? 'UPI ID' : 'Phone Number'}
                </Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={editField === 'upi' ? 'yourname@upi' : '+91 XXXXXXXXXX'}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditField(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="text-2xl">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.displayName || 'User'}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary"
                onClick={() => openEdit('profile')}
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            className="w-full flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-surface-hover transition-colors"
            onClick={() => openEdit('upi')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">UPI ID</p>
                <p className="text-sm text-muted-foreground">
                  {user?.upiId || 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary">Edit</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>

          <button
            className="w-full flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-surface-hover transition-colors"
            onClick={() => openEdit('phone')}
          >
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Phone Number</p>
                <p className="text-sm text-muted-foreground">
                  {user?.phone || 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary">Edit</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between p-3 -mx-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  {preferences?.theme === 'dark' ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>

          <div className="flex items-center justify-between p-3 -mx-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Language</p>
                <p className="text-sm text-muted-foreground">English</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Default</span>
          </div>

          <div className="flex items-center justify-between p-3 -mx-3 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {preferences?.notifications ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.notifications ?? true}
              onCheckedChange={toggleNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between p-3 -mx-3 rounded-lg opacity-50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium">Change Password</p>
            </div>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>

          <div className="flex items-center justify-between p-3 -mx-3 rounded-lg opacity-50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-sm text-muted-foreground">Off</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">SplitUp v1.0.0</p>
            <div className="flex justify-center gap-4 text-sm">
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open('#', '_blank')}
              >
                Privacy Policy
              </Button>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open('#', '_blank')}
              >
                Terms of Service
              </Button>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => window.open('#', '_blank')}
              >
                Help Center
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full text-danger hover:text-danger hover:bg-danger/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  )
}
