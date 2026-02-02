import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-24 px-4">
      {/* Edit Modal */}
      {editField && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setEditField(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 w-[90%] max-w-md space-y-4 shadow-soft"
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
      <section className="bg-card rounded-2xl p-5 flex items-center shadow-soft animate-fade-in-up stagger-1 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-primary border border-transparent">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-primary text-2xl font-semibold mr-4 shrink-0">
          {user?.displayName?.charAt(0) || 'D'}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{user?.displayName || 'Demo User'}</h2>
          <p className="text-sm text-muted-foreground mb-1">{user?.email || 'demo@example.com'}</p>
          <button
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            onClick={() => openEdit('profile')}
          >
            Edit Profile
          </button>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="bg-card rounded-2xl p-5 shadow-soft space-y-4 animate-fade-in-up stagger-2 transition-all hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Payment Methods
        </h3>

        <button
          className="w-full flex items-center justify-between"
          onClick={() => openEdit('upi')}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">UPI ID</p>
              <p className="text-xs text-muted-foreground">{user?.upiId || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
            Edit <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </button>

        <button
          className="w-full flex items-center justify-between"
          onClick={() => openEdit('phone')}
        >
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Phone Number</p>
              <p className="text-xs text-muted-foreground">{user?.phone || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors">
            Edit <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </button>
      </section>

      {/* Preferences */}
      <section className="bg-card rounded-2xl p-5 shadow-soft space-y-4 animate-fade-in-up stagger-3 transition-all hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Preferences
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                {preferences?.theme === 'dark' ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences?.theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Language</p>
              <p className="text-xs text-muted-foreground">English</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Default</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {preferences?.notifications ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences?.notifications ?? true}
            onCheckedChange={toggleNotifications}
          />
        </div>
      </section>

      {/* Privacy & Security */}
      <section className="bg-card rounded-2xl p-5 shadow-soft space-y-4 animate-fade-in-up stagger-4 transition-all hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Privacy & Security
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Change Password</p>
          </div>
          <span className="text-xs text-muted-foreground/50">Coming soon</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Two-Factor Auth</p>
              <p className="text-xs text-muted-foreground">Off</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground/50">Coming soon</span>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-card rounded-2xl p-5 text-center shadow-soft animate-fade-in-up stagger-5 transition-all hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-primary/50">
        <p className="text-xs text-muted-foreground mb-4">SplitUp v1.0.0</p>
        <div className="flex justify-center gap-6 text-xs font-medium text-primary">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Help Center</a>
        </div>
      </section>

      {/* Sign Out Button */}
      <button
        className="w-full bg-danger/5 border border-danger/20 rounded-xl py-3 flex items-center justify-center gap-2 text-danger font-medium text-sm transition-all hover:bg-danger/15 hover:border-danger/40 hover:-translate-y-0.5 active:scale-[0.97] animate-fade-in-up stagger-6"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  )
}
