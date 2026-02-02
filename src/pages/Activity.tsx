import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Download, Filter, Loader2 } from 'lucide-react'
import { getCategoryInfo } from '@/constants/categories'
import { expensesService } from '@/services/supabase/database'
import { useAuth } from '@/contexts/AuthContext'
import type { ExpenseCategory, Expense } from '@/types'

type QuickFilter = 'All' | 'This Month' | 'Pending' | 'Settled' | 'You Paid'

export default function Activity() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('All')

  // Fetch expenses on mount
  useEffect(() => {
    async function fetchExpenses() {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const userExpenses = await expensesService.getUserExpenses(user.id)
        setExpenses(userExpenses)
      } catch (error) {
        console.error('Failed to fetch expenses:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchExpenses()
  }, [user?.id])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query)
      )
    }

    // Quick filter
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    switch (activeFilter) {
      case 'This Month':
        filtered = filtered.filter(e => new Date(e.createdAt) >= startOfMonth)
        break
      case 'Pending':
        filtered = filtered.filter(e => {
          const userSplit = e.splits.find(s => s.userId === user?.id)
          return userSplit && !userSplit.isPaid
        })
        break
      case 'Settled':
        filtered = filtered.filter(e => {
          const userSplit = e.splits.find(s => s.userId === user?.id)
          return userSplit && userSplit.isPaid
        })
        break
      case 'You Paid':
        filtered = filtered.filter(e => e.paidBy === user?.id)
        break
    }

    return filtered
  }, [expenses, searchQuery, activeFilter, user?.id])

  // Group by date
  const groupedExpenses = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const groups: { today: Expense[]; yesterday: Expense[]; earlier: Expense[] } = {
      today: [],
      yesterday: [],
      earlier: [],
    }

    filteredExpenses.forEach(expense => {
      const expenseDate = new Date(expense.createdAt)
      const expenseDayStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), expenseDate.getDate())

      if (expenseDayStart.getTime() === today.getTime()) {
        groups.today.push(expense)
      } else if (expenseDayStart.getTime() === yesterday.getTime()) {
        groups.yesterday.push(expense)
      } else {
        groups.earlier.push(expense)
      }
    })

    return groups
  }, [filteredExpenses])

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Your Share', 'Paid By You']
    const rows = filteredExpenses.map(e => {
      const userSplit = e.splits.find(s => s.userId === user?.id)
      return [
        new Date(e.createdAt).toLocaleDateString(),
        e.description,
        e.category,
        e.amount.toString(),
        userSplit?.amount.toString() || '0',
        e.paidBy === user?.id ? 'Yes' : 'No'
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const quickFilters: QuickFilter[] = ['All', 'This Month', 'Pending', 'Settled', 'You Paid']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">Your expense history</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 animate-fade-in-up stagger-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setActiveFilter('All')}
          title="Clear filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar animate-fade-in-up stagger-3">
        {quickFilters.map((filter) => (
          <Button
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No expenses found</p>
          <p className="text-sm mt-1">
            {searchQuery || activeFilter !== 'All'
              ? 'Try adjusting your filters'
              : 'Add expenses in your groups to see them here'}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4 animate-fade-in-up stagger-4">
        {/* Today Section */}
        {groupedExpenses.today.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Today</h3>
            {groupedExpenses.today.map((expense) => (
              <ActivityCard key={expense.id} expense={expense} currentUserId={user?.id || ''} />
            ))}
          </div>
        )}

        {/* Yesterday Section */}
        {groupedExpenses.yesterday.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Yesterday</h3>
            {groupedExpenses.yesterday.map((expense) => (
              <ActivityCard key={expense.id} expense={expense} currentUserId={user?.id || ''} />
            ))}
          </div>
        )}

        {/* Earlier */}
        {groupedExpenses.earlier.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Earlier</h3>
            {groupedExpenses.earlier.map((expense) => (
              <ActivityCard key={expense.id} expense={expense} currentUserId={user?.id || ''} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCard({ expense, currentUserId }: { expense: Expense; currentUserId: string }) {
  const category = getCategoryInfo(expense.category as ExpenseCategory)
  const userSplit = expense.splits.find(s => s.userId === currentUserId)
  const isPaidByUser = expense.paidBy === currentUserId
  const isSettled = userSplit?.isPaid || isPaidByUser

  return (
    <Card className="hover:bg-surface-hover transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg bg-primary/20">
              {category ? (
                (() => {
                  const CategoryIcon = category.icon
                  return <CategoryIcon className="h-5 w-5" style={{ color: category.color }} />
                })()
              ) : (
                '🧾'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{expense.description}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPaidByUser ? 'You paid' : 'Expense'} • {formatDate(new Date(expense.createdAt).getTime(), 'relative')}
              </p>
              <Badge
                variant={isSettled ? 'success' : 'warning'}
                className="mt-1"
              >
                {isSettled ? '✓ Settled' : 'Pending'}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(expense.amount)}</p>
            {userSplit && (
              <p className="text-sm text-muted-foreground">
                Your share: {formatCurrency(userSplit.amount)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
