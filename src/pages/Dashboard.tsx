import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
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
        const isToday = index === todayIndex

        return (
          <div key={index} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
            <div className="w-full bg-muted rounded-full relative h-32 flex items-end overflow-hidden">
              <div
                className={`w-full rounded-full transition-all duration-300 ${
                  isToday
                    ? 'bg-primary'
                    : 'bg-primary/40 group-hover:bg-primary'
                }`}
                style={{ height: `${Math.max(heightPercent, 5)}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${
              isToday ? 'text-foreground' : 'text-muted-foreground'
            }`}>
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

  // Calculate spending breakdown (mock data for demo - would be derived from real categories)
  const spendingBreakdown = useMemo(() => {
    // In production, calculate from actual expense categories
    return {
      housing: 60,
      health: 20,
      groceries: 15,
      fun: 8,
      other: 3,
    }
  }, [])

  // Weekly spending data (mock - would be calculated from real expenses)
  const weeklyData = useMemo(() => {
    // In production, calculate actual daily spending for the week
    return [30, 45, 25, 60, 85, 95, 50]
  }, [])

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
    // If no groups, redirect to create one
    if (groups.length === 0) {
      navigate('/groups')
      return
    }

    // Use first group for voice input (or could show selector)
    const targetGroup = groups[0]
    const groupMembers = members[targetGroup.id] || []

    // Create splits - equal split among all members
    const splitAmount = parsedExpense.amount / groupMembers.length
    const splits = groupMembers.map(member => ({
      userId: member.userId,
      amount: splitAmount
    }))

    const newExpense = await expensesService.create(
      targetGroup.id,
      parsedExpense.description,
      parsedExpense.amount,
      parsedExpense.category,
      user?.id || '', // paidBy current user
      splits
    )

    if (newExpense) {
      addExpense(newExpense)
      setRecentExpenses(prev => [newExpense, ...prev.slice(0, 4)])
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
      <header className="pt-8 px-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Hello, {user?.displayName?.split(' ')[0] || 'Demo'}! <span className="text-2xl">👋</span>
          </h1>
          <button
            className="p-2 rounded-full bg-card shadow-sm text-muted-foreground hover:text-primary transition-colors"
            onClick={() => {
              const newTheme = preferences?.theme === 'dark' ? 'light' : 'dark'
              updatePreferences({ theme: newTheme })
              document.documentElement.setAttribute('data-theme', newTheme)
              localStorage.setItem('theme', newTheme)
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Hostel Management & Budget</p>
      </header>

      {/* Main Content */}
      <main className="px-5 space-y-6">
        {/* Total Balance Card */}
        <div className="bg-primary rounded-3xl p-6 text-primary-foreground shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Balance</span>
              <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold mb-6">{formatCurrency(12450)}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1 opacity-90">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-tight">Income</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(15000)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1 opacity-90">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-tight">Spent</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(2550)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            className="bg-secondary rounded-2xl p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform border border-primary/20 touch-manipulation"
            onClick={handleVoiceEntry}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-card text-primary shadow-sm">
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
            className="bg-card rounded-2xl p-5 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform shadow-soft border border-border touch-manipulation"
            onClick={handleAddManual}
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-foreground text-sm">Split Bill</h3>
              <p className="text-[10px] font-medium text-muted-foreground">Group Expense</p>
            </div>
          </button>
        </div>

        {/* Spending Breakdown */}
        <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z" />
              </svg>
              Spending Breakdown
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-secondary text-primary rounded-full">This Month</span>
          </div>

          {/* Main Progress Ring */}
          <div className="flex justify-center mb-10">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="progress-ring w-full h-full" height="160" width="160">
                <circle
                  className="text-muted"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="10"
                />
                <circle
                  className="text-primary"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (budgetPercentRemaining / 100) * 440}
                  strokeLinecap="round"
                  strokeWidth="10"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Remaining</span>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(remainingBudget)}</span>
                <span className="text-[10px] text-primary font-bold">{Math.round(budgetPercentRemaining)}% Left</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-3 gap-y-8 gap-x-2">
            <CircularProgress percentage={spendingBreakdown.housing} color="var(--color-primary)" label="Housing" />
            <CircularProgress percentage={spendingBreakdown.health} color="var(--color-pistachio-300)" label="Health" />
            <CircularProgress percentage={spendingBreakdown.groceries} color="var(--color-pistachio-500)" label="Groceries" />
            <CircularProgress percentage={spendingBreakdown.fun} color="var(--color-secondary)" label="Fun" />
            <CircularProgress percentage={spendingBreakdown.other} color="var(--color-pistachio-200)" label="Other" />
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="bg-card rounded-3xl p-6 shadow-soft border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Weekly Trends
            </h3>
            <span className="text-xs font-medium text-muted-foreground">Last 7 Days</span>
          </div>
          <WeeklyTrendsChart data={weeklyData} />
        </div>

        {/* AI Insight Card */}
        <div className="bg-secondary/50 rounded-2xl p-5 border border-primary/20">
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
