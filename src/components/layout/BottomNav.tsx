import { NavLink } from 'react-router-dom'
import { Home, Users, Wallet, History, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'

const navItems = [
  { to: ROUTES.DASHBOARD, icon: Home, label: 'Home' },
  { to: ROUTES.GROUPS, icon: Users, label: 'Groups' },
  { to: ROUTES.BUDGET, icon: Wallet, label: 'Budget' },
  { to: ROUTES.ACTIVITY, icon: History, label: 'Activity' },
  { to: ROUTES.PROFILE, icon: User, label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110'
                  )}
                />
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
