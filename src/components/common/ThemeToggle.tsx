import { Moon, Sun } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function ThemeToggle() {
  const { preferences, updatePreferences } = useAuth()

  const toggleTheme = () => {
    const newTheme = preferences?.theme === 'dark' ? 'light' : 'dark'
    updatePreferences({ theme: newTheme })

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)

    // Persist to localStorage
    localStorage.setItem('theme', newTheme)
  }

  const isDark = preferences?.theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="touch-manipulation"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}
