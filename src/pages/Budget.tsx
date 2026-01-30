import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES } from '@/constants/categories'
import { budgetService, expensesService } from '@/services/supabase/database'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, Edit2, Save, X } from 'lucide-react'
import type { Expense } from '@/types'

interface Budget {
  id: string
  userId: string
  monthlyLimit: number
  categories: Record<string, number>
}

export default function Budget() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedLimit, setEditedLimit] = useState('')
  const [editedCategories, setEditedCategories] = useState<Record<string, string>>({})

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const [userBudget, userExpenses] = await Promise.all([
          budgetService.getUserBudget(user.id),
          expensesService.getUserExpenses(user.id),
        ])
        setBudget(userBudget)
        setExpenses(userExpenses)

        if (userBudget) {
          setEditedLimit(userBudget.monthlyLimit.toString())
          const catEdits: Record<string, string> = {}
          Object.entries(userBudget.categories).forEach(([key, val]) => {
            catEdits[key] = (val as number).toString()
          })
          setEditedCategories(catEdits)
        }
      } catch (error) {
        console.error('Failed to fetch budget data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  // Calculate spending by category for current month
  const spendingByCategory = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const spending: Record<string, number> = {}
    CATEGORIES.forEach(cat => {
      spending[cat.id] = 0
    })

    expenses
      .filter(e => new Date(e.createdAt) >= startOfMonth)
      .forEach(e => {
        const userSplit = e.splits.find(s => s.userId === user?.id)
        if (userSplit) {
          spending[e.category] = (spending[e.category] || 0) + userSplit.amount
        }
      })

    return spending
  }, [expenses, user?.id])

  // Calculate total spent this month
  const totalSpent = useMemo(() => {
    return Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0)
  }, [spendingByCategory])

  // Calculate days left in month
  const daysLeft = useMemo(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return lastDay.getDate() - now.getDate()
  }, [])

  // Get current month name
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })

  // Handle save
  const handleSave = async () => {
    if (!user?.id) return

    const newLimit = parseFloat(editedLimit) || 10000
    const newCategories: Record<string, number> = {}
    Object.entries(editedCategories).forEach(([key, val]) => {
      newCategories[key] = parseFloat(val) || 0
    })

    await budgetService.updateBudget(user.id, newLimit, newCategories)
    setBudget({
      id: budget?.id || 'new',
      userId: user.id,
      monthlyLimit: newLimit,
      categories: newCategories,
    })
    setIsEditing(false)
  }

  // Start editing
  const startEditing = () => {
    if (budget) {
      setEditedLimit(budget.monthlyLimit.toString())
      const catEdits: Record<string, string> = {}
      CATEGORIES.forEach(cat => {
        catEdits[cat.id] = (budget.categories[cat.id] || 0).toString()
      })
      setEditedCategories(catEdits)
    }
    setIsEditing(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const monthlyLimit = budget?.monthlyLimit || 10000
  const percentUsed = monthlyLimit > 0 ? Math.round((totalSpent / monthlyLimit) * 100) : 0
  const remaining = monthlyLimit - totalSpent

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-muted-foreground">Track and manage your spending</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="w-full">
          <TabsTrigger value="personal" className="flex-1">
            Personal
          </TabsTrigger>
          <TabsTrigger value="group" className="flex-1">
            Group
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6 mt-6">
          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{currentMonth} Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <Label>Monthly Budget Limit</Label>
                  <Input
                    type="number"
                    value={editedLimit}
                    onChange={(e) => setEditedLimit(e.target.value)}
                    placeholder="Enter monthly limit"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">
                        {formatCurrency(totalSpent)}
                      </p>
                      <p className="text-muted-foreground">
                        of {formatCurrency(monthlyLimit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-semibold ${remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(Math.abs(remaining))}
                      </p>
                      <p className="text-muted-foreground">
                        {remaining >= 0 ? 'remaining' : 'over budget'}
                      </p>
                    </div>
                  </div>

                  <Progress value={Math.min(percentUsed, 100)} className="h-3" />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{percentUsed}% used</span>
                    <span className="text-muted-foreground">{daysLeft} days left</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map((cat) => {
                const spent = spendingByCategory[cat.id] || 0
                const catBudget = budget?.categories[cat.id] || 0
                const percent = catBudget > 0 ? Math.round((spent / catBudget) * 100) : 0
                const isOverBudget = catBudget > 0 && percent > 100

                const CategoryIcon = cat.icon

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-5 w-5" style={{ color: cat.color }} />
                        <span className="font-medium">{cat.label}</span>
                      </div>
                      {isEditing ? (
                        <Input
                          type="number"
                          className="w-24 h-8 text-right"
                          value={editedCategories[cat.id] || ''}
                          onChange={(e) =>
                            setEditedCategories(prev => ({ ...prev, [cat.id]: e.target.value }))
                          }
                          placeholder="0"
                        />
                      ) : (
                        <div className="text-right">
                          <span className={isOverBudget ? 'text-danger' : 'text-foreground'}>
                            {formatCurrency(spent)}
                          </span>
                          {catBudget > 0 && (
                            <span className="text-muted-foreground">
                              {' '}/ {formatCurrency(catBudget)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!isEditing && catBudget > 0 && (
                      <>
                        <Progress
                          value={Math.min(percent, 100)}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percent}%</span>
                          {isOverBudget ? (
                            <span className="text-danger">
                              Over by {formatCurrency(spent - catBudget)}
                            </span>
                          ) : (
                            <span>{formatCurrency(catBudget - spent)} left</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* AI Insights */}
          {!isEditing && (
            <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-amber-500/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                    🤖
                  </div>
                  <div>
                    <p className="font-medium">Budget Advisor</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {percentUsed < 50
                        ? `Great job! You've only used ${percentUsed}% of your budget with ${daysLeft} days remaining.`
                        : percentUsed < 80
                        ? `You're on track. You've used ${percentUsed}% of your budget so far.`
                        : percentUsed < 100
                        ? `Heads up! You've used ${percentUsed}% of your budget. Consider slowing down spending.`
                        : `You've exceeded your budget by ${formatCurrency(totalSpent - monthlyLimit)}. Review your expenses.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="group" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">No group budget set</h3>
              <p className="text-muted-foreground">
                Set a shared budget for your group to track collective spending.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
