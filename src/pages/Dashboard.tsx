import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  TrendingUp,
  Clock,
  Mic,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { groupsService, expensesService, budgetService } from '@/services/supabase/database'
import { useGroupStore } from '@/stores/useGroupStore'
import { useExpenseStore } from '@/stores/useExpenseStore'
import ExpenseForm from '@/components/features/expenses/ExpenseForm'
import type { Group, Expense, GroupMember } from '@/types'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { groups, setGroups, members, setMembers } = useGroupStore()
  const { addExpense } = useExpenseStore()

  const [isLoading, setIsLoading] = useState(true)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [monthlyBudget, setMonthlyBudget] = useState(10000)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showGroupSelector, setShowGroupSelector] = useState(false)

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

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

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

  // Get members for selected group
  const selectedGroupMembers: GroupMember[] = selectedGroup
    ? (members[selectedGroup.id] || [])
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-24">
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

      {/* Header - Mobile Optimized */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight">
            Hello, {user?.displayName?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Here's your financial overview</p>
        </div>
      </div>

      {/* Quick Stats - Mobile-First Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Balance Card - Featured on Mobile */}
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30 touch-manipulation active:scale-[0.99] transition-transform">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Net Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-success whitespace-nowrap">
              {formatCurrency(stats.balance)}
            </div>
            <div className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
              <div className="flex items-center gap-1.5 text-success">
                <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Owed to you: {formatCurrency(stats.owedToYou)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-danger">
                <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">You owe: {formatCurrency(stats.youOwe)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spending - Compact on Mobile */}
        <Card className="touch-manipulation active:scale-[0.99] transition-transform">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Monthly Spending</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold whitespace-nowrap">
              {formatCurrency(stats.monthlySpending)}
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex justify-between text-xs md:text-sm text-muted-foreground gap-2">
                <span className="whitespace-nowrap">of {formatCurrency(stats.monthlyBudget)}</span>
                <span className="flex-shrink-0 font-medium">
                  {Math.round((stats.monthlySpending / stats.monthlyBudget) * 100)}%
                </span>
              </div>
              <div className="h-2 md:h-2.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      (stats.monthlySpending / stats.monthlyBudget) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments - Touch Optimized */}
        <Card className="touch-manipulation active:scale-[0.99] transition-transform">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Pending Payments</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3">
            <div className="text-xl md:text-2xl lg:text-3xl font-bold">{stats.pendingPayments}</div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-warning leading-relaxed">
                {stats.pendingPayments > 0 ? `${stats.pendingPayments} payment${stats.pendingPayments > 1 ? 's' : ''} overdue` : 'No pending payments'}
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary text-xs md:text-sm touch-manipulation"
                onClick={() => navigate('/groups')}
              >
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Touch-Optimized 48px Minimum */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Button
          variant="outline"
          className="h-auto min-h-[64px] md:min-h-[72px] py-3 md:py-4 flex flex-col items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm md:text-base"
          onClick={() => {
            // Voice button - for now navigate to groups to use voice there
            navigate('/groups')
          }}
        >
          <Mic className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
          <span className="font-medium">Add Voice</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-[64px] md:min-h-[72px] py-3 md:py-4 flex flex-col items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm md:text-base"
          onClick={handleAddManual}
        >
          <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
          <span className="font-medium">Add Manual</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-[64px] md:min-h-[72px] py-3 md:py-4 flex flex-col items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm md:text-base"
          onClick={() => navigate('/groups')}
        >
          <Wallet className="h-5 w-5 md:h-6 md:w-6 text-success flex-shrink-0" />
          <span className="font-medium">Settle Up</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-[64px] md:min-h-[72px] py-3 md:py-4 flex flex-col items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm md:text-base"
          onClick={() => navigate('/budget')}
        >
          <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-warning flex-shrink-0" />
          <span className="font-medium">Budget</span>
        </Button>
      </div>

      {/* Recent Activity - Scroll Optimized */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <span className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-success animate-pulse flex-shrink-0" />
              <span>Recent Activity</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 md:h-9 px-3 md:px-4 text-xs md:text-sm touch-manipulation"
              onClick={() => navigate('/activity')}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 md:space-y-3">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-12 md:py-16 text-muted-foreground">
              <div className="text-4xl md:text-5xl mb-4">💸</div>
              <p className="text-sm md:text-base mb-2">No recent activity</p>
              <Button
                variant="link"
                className="mt-2 text-sm md:text-base touch-manipulation"
                onClick={() => navigate('/groups')}
              >
                Join or create a group to get started →
              </Button>
            </div>
          ) : (
            recentExpenses.map((expense) => {
              const userSplit = expense.splits.find(s => s.userId === user?.id)
              const isPayer = expense.paidBy === user?.id

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-lg bg-surface hover:bg-surface-hover active:bg-surface-hover/80 transition-all touch-manipulation min-h-[72px]"
                >
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center bg-primary/20 text-primary text-xl md:text-2xl flex-shrink-0">
                      🧾
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{expense.description}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {isPayer ? 'You paid' : 'Expense'} • {formatRelativeTime(expense.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-semibold text-sm md:text-base whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </p>
                    {userSplit && (
                      <p className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">
                        Share: {formatCurrency(userSplit.amount)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* AI Insight Card - Mobile Optimized */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 touch-manipulation active:scale-[0.99] transition-transform">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl md:text-3xl flex-shrink-0">
              💡
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">AI Insight</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-1.5 leading-relaxed">
                You typically spend 2x more on weekends. You've spent ₹800
                already this Saturday. Consider setting a weekend budget limit.
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary mt-2 md:mt-3 text-xs md:text-sm touch-manipulation"
                onClick={() => navigate('/budget')}
              >
                Set Weekend Budget →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
