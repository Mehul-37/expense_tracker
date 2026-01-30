import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Users,
  Settings,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpenseForm } from '@/components/features/expenses'
import { useAuth } from '@/contexts/AuthContext'
import { groupsService, expensesService } from '@/services/supabase'
import { formatCurrency } from '@/lib/utils'
import { CATEGORIES } from '@/constants'
import type { Group, Expense } from '@/types'

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Calculate optimized settlements
  const settlements = useMemo(() => {
    if (!group) return []

    // Get all members with non-zero balances
    const creditors = group.members.filter(m => m.balance > 0.01) // People owed money
    const debtors = group.members.filter(m => m.balance < -0.01) // People who owe money

    const result: Array<{
      from: string
      to: string
      amount: number
      fromName: string
      toName: string
    }> = []

    // Create copies to work with
    const creditorBalances = creditors.map(c => ({ ...c, remaining: c.balance }))
    const debtorBalances = debtors.map(d => ({ ...d, remaining: Math.abs(d.balance) }))

    // Greedy algorithm: match largest debtor with largest creditor
    while (creditorBalances.length > 0 && debtorBalances.length > 0) {
      // Sort by remaining amounts
      creditorBalances.sort((a, b) => b.remaining - a.remaining)
      debtorBalances.sort((a, b) => b.remaining - a.remaining)

      const creditor = creditorBalances[0]
      const debtor = debtorBalances[0]

      const amount = Math.min(creditor.remaining, debtor.remaining)

      result.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount * 100) / 100,
        fromName: debtor.displayName,
        toName: creditor.displayName,
      })

      creditor.remaining -= amount
      debtor.remaining -= amount

      if (creditor.remaining < 0.01) creditorBalances.shift()
      if (debtor.remaining < 0.01) debtorBalances.shift()
    }

    return result
  }, [group])

  useEffect(() => {
    if (!groupId) return

    const loadGroup = async () => {
      setIsLoading(true)
      const groupData = await groupsService.getGroupWithMembers(groupId)
      if (groupData) {
        setGroup(groupData)
        const expenseData = await expensesService.getGroupExpenses(groupId)
        setExpenses(expenseData)
      }
      setIsLoading(false)
    }

    loadGroup()

    // Subscribe to real-time updates
    const unsubExpenses = expensesService.subscribeToGroupExpenses(
      groupId,
      (newExpenses) => setExpenses(newExpenses)
    )

    return () => {
      unsubExpenses()
    }
  }, [groupId])

  const handleAddExpense = async (data: {
    description: string
    amount: number
    category: string
    paidBy: string
    splits: { userId: string; amount: number }[]
  }) => {
    if (!groupId || !user) return

    const expense = await expensesService.create(
      groupId,
      data.description,
      data.amount,
      data.category,
      data.paidBy,
      data.splits
    )

    if (expense) {
      setExpenses((prev) => [expense, ...prev])
    }
  }

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const currentMember = group?.members.find((m) => m.userId === user?.id)
  const userBalance = currentMember?.balance || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Group not found</p>
        <Button onClick={() => navigate('/groups')}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-card rounded-lg p-6 w-[90%] max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Group Settings</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowSettings(false)
                  // TODO: Implement rename group
                }}
              >
                Edit Group Name
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowSettings(false)
                  // TODO: Implement leave group
                }}
              >
                Leave Group
              </Button>
              {currentMember?.role === 'admin' && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-danger hover:text-danger"
                  onClick={() => {
                    setShowSettings(false)
                    // TODO: Implement delete group
                  }}
                >
                  Delete Group
                </Button>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group.members.length} members
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p
                className={`text-3xl font-bold ${
                  userBalance >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {userBalance >= 0 ? '+' : ''}
                {formatCurrency(userBalance)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {userBalance >= 0
                  ? 'You are owed money'
                  : 'You owe money'}
              </p>
            </div>
            <div
              className={`p-4 rounded-full ${
                userBalance >= 0 ? 'bg-success/20' : 'bg-danger/20'
              }`}
            >
              {userBalance >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-danger" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Code */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invite Code</p>
              <p className="font-mono text-lg font-bold tracking-wider">
                {group.inviteCode}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyInviteCode}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="expenses" className="flex-1">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-1">
            Members
          </TabsTrigger>
          <TabsTrigger value="settle" className="flex-1">
            Settle Up
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No expenses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first expense to start tracking
                </p>
                <Button onClick={() => setShowExpenseForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense, index) => {
              const category = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[7]
              const ExpenseIcon = category.icon
              const payer = group.members.find((m) => m.userId === expense.paidBy)
              const userSplit = expense.splits.find(
                (s) => s.userId === user?.id
              )

              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:bg-surface-hover transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="p-3 rounded-full"
                          style={{
                            backgroundColor: `${category.color}20`,
                            color: category.color,
                          }}
                        >
                          <ExpenseIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {expense.description}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {payer?.displayName || 'Unknown'} paid{' '}
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          {userSplit && (
                            <p
                              className={`font-semibold ${
                                expense.paidBy === user?.id
                                  ? 'text-success'
                                  : 'text-danger'
                              }`}
                            >
                              {expense.paidBy === user?.id ? '+' : '-'}
                              {formatCurrency(
                                expense.paidBy === user?.id
                                  ? expense.amount - userSplit.amount
                                  : userSplit.amount
                              )}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.displayName}
                        {member.userId === user?.id && ' (You)'}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  <p
                    className={`font-semibold ${
                      member.balance >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {member.balance >= 0 ? '+' : ''}
                    {formatCurrency(member.balance)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settle" className="space-y-4 mt-4">
          {settlements.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <h3 className="font-semibold mb-2">All Settled Up!</h3>
                <p className="text-sm text-muted-foreground">
                  Everyone's balance is zero. No settlements needed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-amber-500/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                      💡
                    </div>
                    <div>
                      <p className="font-medium">Optimized Settlement</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {settlements.length} payment{settlements.length > 1 ? 's' : ''} needed to settle all debts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {settlements.map((settlement, index) => {
                const isUserInvolved = settlement.from === user?.id || settlement.to === user?.id
                const isUserPaying = settlement.from === user?.id

                return (
                  <Card
                    key={index}
                    className={isUserInvolved ? 'border-primary/50' : ''}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {settlement.fromName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {settlement.from === user?.id ? 'You' : settlement.fromName} pays{' '}
                            {settlement.to === user?.id ? 'you' : settlement.toName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Settlement payment
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(settlement.amount)}
                          </p>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      {isUserPaying && (
                        <Button className="w-full mt-3" size="sm">
                          Record Payment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* FAB */}
      <motion.button
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary hover:bg-primary-hover shadow-lg flex items-center justify-center"
        onClick={() => setShowExpenseForm(true)}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="h-6 w-6 text-white" />
      </motion.button>

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        onSubmit={handleAddExpense}
        members={group.members}
        currentUserId={user?.id || ''}
      />
    </div>
  )
}
