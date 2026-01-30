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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
      }}
    >
      {/* Mobile-First: 48px+ Touch Targets, Thumb-Friendly Zone */}
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                // Touch-optimized: min 48px height, larger tap area
                'flex flex-col items-center justify-center gap-1',
                'min-h-[56px] min-w-[56px] px-3 py-2',
                'rounded-xl transition-all duration-200',
                // Remove tap highlight for custom feedback
                'touch-manipulation active:scale-95',
                '-webkit-tap-highlight-color: transparent',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5 md:h-6 md:w-6 transition-transform duration-200 flex-shrink-0',
                    isActive && 'scale-110'
                  )}
                />
                <span className={cn(
                  'text-[10px] md:text-xs font-medium leading-tight',
                  isActive && 'font-semibold'
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
