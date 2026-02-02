import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { groupsService, expensesService, budgetService } from '@/services/supabase/database'
import { useGroupStore } from '@/stores/useGroupStore'
import { useExpenseStore } from '@/stores/useExpenseStore'
import { useVoiceStore } from '@/stores'
import ExpenseForm from '@/components/features/expenses/ExpenseForm'
import VoiceButton from '@/components/features/voice/VoiceButton'
import type { Group, Expense, GroupMember } from '@/types'
import type { ParsedExpense } from '@/services/ai'

// Circular Progress Component
function CircularProgress({
  percentage,
  size = 64,
  strokeWidth = 6,
  color = 'var(--color-primary)',
  label,
  showPercentage = true
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  showPercentage?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="progress-ring" width={size} height={size}>
          <circle
            className="text-muted"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="progress-ring__circle"
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
      {label && (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tighter mt-2">
          {label}
        </span>
      )}
    </div>
  )
}

// Weekly Bar Chart Component
function WeeklyTrendsChart({ data }: { data: number[] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const maxValue = Math.max(...data, 1)
  const today = new Date().getDay()
  // Convert Sunday=0 to index 6, Monday=1 to index 0, etc.
  const todayIndex = today === 0 ? 6 : today - 1

  return (
    <div className="h-40 flex items-end justify-between gap-2.5 pt-2">
      {data.map((value, index) => {
        const heightPercent = (value / maxValue) * 100

        return (
          <div key={index} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
            <div className="w-full bg-muted rounded-full relative h-32 flex items-end overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-300 bg-primary"
                style={{ height: `${Math.max(heightPercent, 5)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-foreground">
              {days[index]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const { user, preferences, updatePreferences } = useAuth()
  const navigate = useNavigate()
  const { groups, setGroups, members, setMembers } = useGroupStore()
  const { addExpense } = useExpenseStore()

  const [isLoading, setIsLoading] = useState(true)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [monthlyBudget, setMonthlyBudget] = useState(10000)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showGroupSelector, setShowGroupSelector] = useState(false)
  const { setActive: setVoiceActive } = useVoiceStore()

  const themeButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return
      setIsLoading(true)
      try {
        // Fetch groups with members
        const userGroups = await groupsService.getUserGroups(user.id)
        setGroups(userGroups)

        // Fetch members for each group
        for (const group of userGroups) {
          const groupWithMembers = await groupsService.getGroupWithMembers(group.id)
          if (groupWithMembers?.members) {
            setMembers(group.id, groupWithMembers.members)
          }
        }

        // Fetch recent expenses
        const expenses = await expensesService.getUserExpenses(user.id)
        setRecentExpenses(expenses.slice(0, 5))

        // Fetch budget
        const budget = await budgetService.getUserBudget(user.id)
        if (budget?.monthlyLimit) {
          setMonthlyBudget(budget.monthlyLimit)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user?.id, setGroups, setMembers])

  // Calculate stats from real data
  const stats = useMemo(() => {
    let owedToYou = 0
    let youOwe = 0

    // Calculate from group balances
    groups.forEach(group => {
      const groupMembers = members[group.id] || []
      const currentMember = groupMembers.find(m => m.userId === user?.id)
      if (currentMember) {
        if (currentMember.balance > 0) {
          owedToYou += currentMember.balance
        } else {
          youOwe += Math.abs(currentMember.balance)
        }
      }
    })

    // Calculate monthly spending from recent expenses
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyExpenses = recentExpenses.filter(e => new Date(e.createdAt) >= startOfMonth)
    const monthlySpending = monthlyExpenses.reduce((sum, e) => {
      const userSplit = e.splits.find(s => s.userId === user?.id)
      return sum + (userSplit?.amount || 0)
    }, 0)

    // Count pending (negative balances = you owe someone)
    const pendingPayments = groups.filter(group => {
      const groupMembers = members[group.id] || []
      const currentMember = groupMembers.find(m => m.userId === user?.id)
      return currentMember && currentMember.balance < 0
    }).length

    return {
      balance: owedToYou - youOwe,
      monthlySpending,
      monthlyBudget,
      pendingPayments,
      youOwe,
      owedToYou,
    }
  }, [groups, members, recentExpenses, user?.id, monthlyBudget])

  // Calculate spending breakdown from real expense data
  const spendingBreakdown = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Calculate spending by category
    const categorySpending: Record<string, number> = {}
    let totalCategorySpending = 0

    recentExpenses
      .filter(e => new Date(e.createdAt) >= startOfMonth)
      .forEach(e => {
        const userSplit = e.splits.find(s => s.userId === user?.id)
        if (userSplit) {
          categorySpending[e.category] = (categorySpending[e.category] || 0) + userSplit.amount
          totalCategorySpending += userSplit.amount
        }
      })

    // DEMO MODE: Inject fake data if real data is low
    if (totalCategorySpending < 5000) {
      categorySpending['food'] = (categorySpending['food'] || 0) + 2400
      categorySpending['utilities'] = (categorySpending['utilities'] || 0) + 800
      categorySpending['travel'] = (categorySpending['travel'] || 0) + 1200
      categorySpending['entertainment'] = (categorySpending['entertainment'] || 0) + 600
      categorySpending['shopping'] = (categorySpending['shopping'] || 0) + 1500
      categorySpending['health'] = (categorySpending['health'] || 0) + 400
      categorySpending['education'] = (categorySpending['education'] || 0) + 1000
      categorySpending['miscellaneous'] = (categorySpending['miscellaneous'] || 0) + 300
    }

    // Convert to percentages - map to display categories
    // Group categories: food -> groceries, entertainment -> fun, etc.
    const food = categorySpending['food'] || 0
    const utilities = categorySpending['utilities'] || 0
    const travel = categorySpending['travel'] || 0
    const entertainment = categorySpending['entertainment'] || 0
    const shopping = categorySpending['shopping'] || 0
    const health = categorySpending['health'] || 0
    const education = categorySpending['education'] || 0
    const miscellaneous = categorySpending['miscellaneous'] || 0

    // Calculate percentages (of budget used per category)
    const budgetCategories = {
      food: monthlyBudget * 0.35, // 35% of budget for food
      utilities: monthlyBudget * 0.15,
      travel: monthlyBudget * 0.15,
      entertainment: monthlyBudget * 0.15,
      health: monthlyBudget * 0.10,
      other: monthlyBudget * 0.10,
    }

    return {
      food: budgetCategories.food > 0 ? Math.min(100, (food / budgetCategories.food) * 100) : 0,
      utilities: budgetCategories.utilities > 0 ? Math.min(100, ((utilities + education) / budgetCategories.utilities) * 100) : 0,
      travel: budgetCategories.travel > 0 ? Math.min(100, (travel / budgetCategories.travel) * 100) : 0,
      entertainment: budgetCategories.entertainment > 0 ? Math.min(100, ((entertainment + shopping) / budgetCategories.entertainment) * 100) : 0,
      health: budgetCategories.health > 0 ? Math.min(100, (health / budgetCategories.health) * 100) : 0,
      other: budgetCategories.other > 0 ? Math.min(100, (miscellaneous / budgetCategories.other) * 100) : 0,
    }
  }, [recentExpenses, user?.id, monthlyBudget])

  // Weekly spending data - calculated from real expenses
  const weeklyData = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday

    // Get start of current week (Monday)
    const startOfWeek = new Date(now)
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(now.getDate() - daysFromMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    // Initialize daily spending array [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    const dailySpending = [0, 0, 0, 0, 0, 0, 0]

    recentExpenses.forEach(expense => {
      const expenseDate = new Date(expense.createdAt)

      // Check if expense is within current week
      if (expenseDate >= startOfWeek) {
        const expenseDayOfWeek = expenseDate.getDay()
        // Convert to Monday-based index (Mon=0, Sun=6)
        const dayIndex = expenseDayOfWeek === 0 ? 6 : expenseDayOfWeek - 1

        const userSplit = expense.splits.find(s => s.userId === user?.id)
        if (userSplit) {
          dailySpending[dayIndex] += userSplit.amount
        }
      }
    })

    // If no data found, return fake data for visualization
    const totalSpending = dailySpending.reduce((a, b) => a + b, 0)
    if (totalSpending === 0) {
      return [450, 120, 890, 340, 600, 230, 780]
    }

    return dailySpending
  }, [recentExpenses, user?.id])

  // Handle expense form submission
  const handleExpenseSubmit = async (data: {
    description: string
    amount: number
    category: string
    paidBy: string
    splits: { userId: string; amount: number }[]
  }) => {
    if (!selectedGroup) return

    const newExpense = await expensesService.create(
      selectedGroup.id,
      data.description,
      data.amount,
      data.category,
      data.paidBy,
      data.splits
    )

    if (newExpense) {
      addExpense(newExpense)
      setRecentExpenses(prev => [newExpense, ...prev.slice(0, 4)])
    }
  }

  // Handle Add Manual click
  const handleAddManual = () => {
    if (groups.length === 0) {
      navigate('/groups')
      return
    }
    if (groups.length === 1) {
      setSelectedGroup(groups[0])
      setShowExpenseForm(true)
    } else {
      setShowGroupSelector(true)
    }
  }

  // Handle voice entry click - open voice modal
  const handleVoiceEntry = () => {
    setVoiceActive(true)
  }

  // Handle voice expense confirmation
  const handleVoiceExpenseConfirm = async (parsedExpense: ParsedExpense) => {
    console.log('handleVoiceExpenseConfirm called with:', parsedExpense)
    console.log('groups:', groups)
    console.log('user:', user)

    // If no groups, redirect to create one
    if (groups.length === 0) {
      console.error('No groups found')
      throw new Error('No groups found. Please create a group first.')
    }

    // Use first group for voice input
    const targetGroup = groups[0]
    const groupMembers = members[targetGroup.id] || []
    console.log('targetGroup:', targetGroup)
    console.log('groupMembers:', groupMembers)

    // If no members in group, add expense with just current user
    let splits: { userId: string; amount: number }[]

    if (groupMembers.length === 0) {
      // No members loaded yet - just assign to current user
      console.log('No members, using current user for split')
      splits = [{
        userId: user?.id || '',
        amount: parsedExpense.amount
      }]
    } else {
      // Create splits - equal split among all members
      const splitAmount = parsedExpense.amount / groupMembers.length
      splits = groupMembers.map(member => ({
        userId: member.userId,
        amount: splitAmount
      }))
    }

    console.log('splits:', splits)

    try {
      const newExpense = await expensesService.create(
        targetGroup.id,
        parsedExpense.description,
        parsedExpense.amount,
        parsedExpense.category,
        user?.id || '', // paidBy current user
        splits
      )

      console.log('newExpense result:', newExpense)

      if (!newExpense) {
        console.error('expensesService.create returned null')
        throw new Error('Failed to create expense')
      }

      addExpense(newExpense)
      setRecentExpenses(prev => [newExpense, ...prev.slice(0, 4)])
      console.log('Expense added successfully!')
    } catch (err) {
      console.error('Error creating expense:', err)
      throw err
    }
  }

  // Get members for selected group
  const selectedGroupMembers: GroupMember[] = selectedGroup
    ? (members[selectedGroup.id] || [])
    : []

  // Calculate remaining budget
  const remainingBudget = monthlyBudget - stats.monthlySpending
  const budgetPercentRemaining = Math.max(0, Math.min(100, (remainingBudget / monthlyBudget) * 100))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative pb-28">
      {/* Group Selector Modal - Mobile Optimized Bottom Sheet */}
      {showGroupSelector && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={() => setShowGroupSelector(false)}
        >
          <div
            className="bg-card rounded-t-3xl md:rounded-lg p-6 w-full md:w-[90%] max-w-md space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            {/* Bottom Sheet Handle (Mobile Only) */}
            <div className="md:hidden w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2" />

            <h2 className="text-lg md:text-xl font-bold">Select a Group</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  className="w-full p-4 md:p-3 rounded-xl md:rounded-lg bg-surface hover:bg-surface-hover active:scale-98 text-left transition-all touch-manipulation"
                  style={{ minHeight: '56px' }}
                  onClick={() => {
                    setSelectedGroup(group)
                    setShowGroupSelector(false)
                    setShowExpenseForm(true)
                  }}
                >
                  <p className="font-medium text-base md:text-sm">{group.name}</p>
                  <p className="text-sm md:text-xs text-muted-foreground">{group.type}</p>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full h-12 md:h-10 text-base md:text-sm"
              onClick={() => setShowGroupSelector(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Expense Form */}
      {selectedGroup && (
        <ExpenseForm
          isOpen={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false)
            setSelectedGroup(null)
          }}
          onSubmit={handleExpenseSubmit}
          members={selectedGroupMembers}
          currentUserId={user?.id || ''}
        />
      )}

      {/* Header */}
      <header className="pt-6 px-6 pb-4 animate-fade-in-up stagger-1">
        <div className="flex items-center justify-between mb-2">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Hello, {user?.displayName?.split(' ')[0] || 'Demo'}! <span className="text-2xl">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Hostel Management & Budget</p>
          </div>

          {/* Theme Toggle Button - Top Right */}
          <button
            ref={themeButtonRef}
            className="p-3 rounded-full bg-card shadow-lg text-foreground hover:shadow-xl transition-all hover:scale-110 active:scale-95 border border-border"
            onClick={(e) => {
              const newTheme = preferences?.theme === 'dark' ? 'light' : 'dark'

              // @ts-ignore - Check for View Transitions API support
              if (!document.startViewTransition) {
                updatePreferences({ theme: newTheme })
                document.documentElement.setAttribute('data-theme', newTheme)
                localStorage.setItem('theme', newTheme)
                return
              }

              const rect = e.currentTarget.getBoundingClientRect()
              const x = rect.left + rect.width / 2
              const y = rect.top + rect.height / 2
              const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
              )

              // @ts-ignore
              const transition = document.startViewTransition(() => {
                updatePreferences({ theme: newTheme })
                document.documentElement.setAttribute('data-theme', newTheme)
                localStorage.setItem('theme', newTheme)
              })

              transition.ready.then(() => {
                document.documentElement.animate(
                  {
                    clipPath: [
                      `circle(0px at ${x}px ${y}px)`,
                      `circle(${endRadius}px at ${x}px ${y}px)`,
                    ],
                  },
                  {
                    duration: 500,
                    easing: 'ease-in-out',
                    // @ts-ignore
                    pseudoElement: '::view-transition-new(root)',
                  }
                )
              })
            }}
          >
            {preferences?.theme === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 space-y-6">
        {/* Total Balance Card */}
        <div className="bg-[#659242] rounded-3xl p-6 text-primary-foreground shadow-xl relative overflow-hidden animate-fade-in-up stagger-2">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Net Balance</span>
              <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold mb-6">{formatCurrency(stats.balance)}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1 opacity-90">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-tight">Owed to You</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(stats.owedToYou)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1 opacity-90">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-tight">You Owe</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(stats.youOwe)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in-up stagger-3">
          <button
            className="group bg-secondary rounded-2xl p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border border-primary/30 touch-manipulation hover:shadow-lg hover:-translate-y-1 hover:border-primary hover:bg-secondary/80 border-pulse"
            onClick={handleVoiceEntry}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-card text-primary shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v7c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.41 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-foreground text-sm">Voice Entry</h3>
              <p className="text-[10px] font-medium text-primary">AI-Powered</p>
            </div>
          </button>
          <button
            className="group bg-secondary rounded-2xl p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border border-primary/60 touch-manipulation hover:shadow-lg hover:-translate-y-1 hover:border-primary hover:bg-secondary/80"
            onClick={handleAddManual}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-card text-primary shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-foreground text-sm">Manual</h3>
              <p className="text-[10px] font-medium text-muted-foreground">Group Expense</p>
            </div>
          </button>
        </div>

        {/* Spending Breakdown - Clickable to Budget Page */}
        <button
          className="bg-card rounded-3xl p-6 shadow-soft border border-border w-full text-left transition-all hover:border-primary hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] touch-manipulation animate-fade-in-up stagger-4 hover-glow"
          onClick={() => navigate('/budget')}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z" />
              </svg>
              Spending Breakdown
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-secondary text-primary rounded-full">This Month</span>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Main Content Container - Flex Layout */}
          {/* Main Content Container - Radial Layout */}
          <div className="relative h-[340px] w-full flex items-center justify-center mb-4">

            {/* Center - Main Progress Ring */}
            <div className="relative w-44 h-44 z-10 bg-card rounded-full shadow-[0_0_30px_-10px_rgba(0,0,0,0.3)] flex items-center justify-center">
              <svg className="progress-ring w-full h-full" height="176" width="176">
                <circle
                  className="text-muted/30"
                  cx="88"
                  cy="88"
                  fill="transparent"
                  r="78"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className="text-primary"
                  cx="88"
                  cy="88"
                  fill="transparent"
                  r="78"
                  stroke="currentColor"
                  strokeDasharray="490"
                  strokeDashoffset={490 - (budgetPercentRemaining / 100) * 490}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Remaining</span>
                <span className="text-3xl font-bold text-foreground">{formatCurrency(remainingBudget)}</span>
                <span className="text-xs text-primary font-bold">{Math.round(budgetPercentRemaining)}% Left</span>
              </div>
            </div>

            {/* 12 o'clock - Food */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <CircularProgress percentage={spendingBreakdown.food} color="#f97316" label="Food" size={56} strokeWidth={5} />
            </div>

            {/* 2 o'clock - Utilities */}
            <div className="absolute top-[18%] right-[8%]">
              <CircularProgress percentage={spendingBreakdown.utilities} color="#3b82f6" label="Utilities" size={56} strokeWidth={5} />
            </div>

            {/* 4 o'clock - Travel */}
            <div className="absolute bottom-[18%] right-[8%]">
              <CircularProgress percentage={spendingBreakdown.travel} color="#22c55e" label="Travel" size={56} strokeWidth={5} />
            </div>

            {/* 6 o'clock - Fun */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <CircularProgress percentage={spendingBreakdown.entertainment} color="#a855f7" label="Fun" size={56} strokeWidth={5} />
            </div>

            {/* 8 o'clock - Health */}
            <div className="absolute bottom-[18%] left-[8%]">
              <CircularProgress percentage={spendingBreakdown.health} color="#ef4444" label="Health" size={56} strokeWidth={5} />
            </div>

            {/* 10 o'clock - Other */}
            <div className="absolute top-[18%] left-[8%]">
              <CircularProgress percentage={spendingBreakdown.other} color="#737373" label="Other" size={56} strokeWidth={5} />
            </div>
          </div>
        </button>

        {/* Weekly Trends - Clickable to Budget Page */}
        <button
          className="bg-card rounded-3xl p-6 shadow-soft border border-border w-full text-left transition-all hover:border-primary hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] touch-manipulation animate-fade-in-up stagger-5 hover-glow"
          onClick={() => navigate('/budget')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Weekly Trends
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Last 7 Days</span>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <WeeklyTrendsChart data={weeklyData} />
        </button>

        {/* AI Insight Card */}
        <div className="bg-secondary/50 rounded-2xl p-5 border border-primary/30 animate-fade-in-up stagger-6 transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" />
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm mb-1">AI Smart Insight</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Your grocery spending is 12% lower than last month. You're on track to save ₹1,200 by end of the semester!
              </p>
              <button
                className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-80"
                onClick={() => navigate('/budget')}
              >
                View Predictions
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Voice Button with Modal */}
      <VoiceButton onExpenseConfirm={handleVoiceExpenseConfirm} />
    </div>
  )
}
