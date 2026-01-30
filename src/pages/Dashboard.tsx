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
    <div className="space-y-6 pb-24">
      {/* Group Selector Modal */}
      {showGroupSelector && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowGroupSelector(false)}
        >
          <div
            className="bg-card rounded-lg p-6 w-[90%] max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Select a Group</h2>
            <div className="space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  className="w-full p-3 rounded-lg bg-surface hover:bg-surface-hover text-left transition-colors"
                  onClick={() => {
                    setSelectedGroup(group)
                    setShowGroupSelector(false)
                    setShowExpenseForm(true)
                  }}
                >
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-muted-foreground">{group.type}</p>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowGroupSelector(false)}>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Hello, {user?.displayName?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Net Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl md:text-3xl font-bold text-success break-words">
              {formatCurrency(stats.balance)}
            </div>
            <div className="space-y-1.5 text-xs md:text-sm">
              <div className="flex items-center gap-1 text-success">
                <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Owed to you: {formatCurrency(stats.owedToYou)}</span>
              </div>
              <div className="flex items-center gap-1 text-danger">
                <ArrowDownRight className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">You owe: {formatCurrency(stats.youOwe)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spending */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Spending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl md:text-3xl font-bold break-words">
              {formatCurrency(stats.monthlySpending)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                <span className="truncate">of {formatCurrency(stats.monthlyBudget)}</span>
                <span className="flex-shrink-0 ml-2">
                  {Math.round((stats.monthlySpending / stats.monthlyBudget) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
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

        {/* Pending Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl md:text-3xl font-bold">{stats.pendingPayments}</div>
            <div className="space-y-1">
              <p className="text-xs md:text-sm text-warning">
                {stats.pendingPayments > 0 ? `${stats.pendingPayments} payment${stats.pendingPayments > 1 ? 's' : ''} overdue` : 'No pending payments'}
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary text-xs md:text-sm"
                onClick={() => navigate('/groups')}
              >
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => {
            // Voice button - for now navigate to groups to use voice there
            navigate('/groups')
          }}
        >
          <Mic className="h-5 w-5 text-primary" />
          <span>Add Voice</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={handleAddManual}
        >
          <Plus className="h-5 w-5 text-primary" />
          <span>Add Manual</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/groups')}
        >
          <Wallet className="h-5 w-5 text-success" />
          <span>Settle Up</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/budget')}
        >
          <TrendingUp className="h-5 w-5 text-warning" />
          <span>Budget</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate('/groups')}
              >
                Join or create a group to get started
              </Button>
            </div>
          ) : (
            recentExpenses.map((expense) => {
              const userSplit = expense.splits.find(s => s.userId === user?.id)
              const isPayer = expense.paidBy === user?.id

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                      🧾
                    </div>
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {isPayer ? 'You paid' : 'Expense'} • {formatRelativeTime(expense.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(expense.amount)}
                    </p>
                    {userSplit && (
                      <p className="text-sm text-muted-foreground">
                        Your share: {formatCurrency(userSplit.amount)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* AI Insight Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
              💡
            </div>
            <div>
              <p className="font-medium">AI Insight</p>
              <p className="text-sm text-muted-foreground mt-1">
                You typically spend 2x more on weekends. You've spent ₹800
                already this Saturday. Consider setting a weekend budget limit.
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary mt-2"
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
