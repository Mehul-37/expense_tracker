import { supabase } from './config'
import type { Group, Expense, Payment } from '@/types'
import { generateInviteCode } from '@/lib/utils'
import {
  isDemoMode,
  demoGroupsService,
  demoExpensesService,
  DEMO_USER_ID,
} from '@/services/demo'

// Groups Service
export const groupsService = {
  // Create a new group
  async create(name: string, userId: string, type: string = 'hostel'): Promise<Group | null> {
    // Demo mode
    if (isDemoMode()) {
      return demoGroupsService.createGroup(name, '', type)
    }

    const inviteCode = generateInviteCode()

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        type,
        invite_code: inviteCode,
        created_by: userId,
      })
      .select()
      .single()

    if (error || !group) return null

    // Add creator as admin member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'admin',
      balance: 0,
    })

    return {
      id: group.id,
      name: group.name,
      type: group.type as Group['type'],
      inviteCode: group.invite_code,
      currency: group.currency,
      members: [],
      createdBy: group.created_by,
      createdAt: group.created_at,
    }
  },

  // Join group by invite code
  async joinByCode(inviteCode: string, userId: string): Promise<Group | null> {
    // Demo mode
    if (isDemoMode()) {
      return demoGroupsService.joinGroup(inviteCode)
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (error || !group) return null

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .single()

    if (existing) return null // Already a member

    // Add as member
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
      balance: 0,
    })

    return {
      id: group.id,
      name: group.name,
      type: group.type as Group['type'],
      inviteCode: group.invite_code,
      currency: group.currency,
      members: [],
      createdBy: group.created_by,
      createdAt: group.created_at,
    }
  },

  // Get user's groups
  async getUserGroups(userId: string): Promise<Group[]> {
    // Demo mode
    if (isDemoMode()) {
      return demoGroupsService.getGroups()
    }

    const { data: memberships, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (
          id,
          name,
          type,
          invite_code,
          currency,
          created_by,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (error || !memberships) return []

    return memberships
      .filter((m) => m.groups)
      .map((m) => {
        const g = m.groups as any
        return {
          id: g.id,
          name: g.name,
          type: g.type,
          inviteCode: g.invite_code,
          currency: g.currency,
          members: [],
          createdBy: g.created_by,
          createdAt: g.created_at,
        }
      })
  },

  // Get group with members
  async getGroupWithMembers(groupId: string): Promise<Group | null> {
    // Demo mode
    if (isDemoMode()) {
      return demoGroupsService.getGroup(groupId)
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (error || !group) return null

    const { data: members } = await supabase
      .from('group_members')
      .select(`
        user_id,
        role,
        balance,
        joined_at,
        users (
          id,
          email,
          display_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)

    return {
      id: group.id,
      name: group.name,
      type: group.type as Group['type'],
      inviteCode: group.invite_code,
      currency: group.currency,
      createdBy: group.created_by,
      createdAt: group.created_at,
      members: (members || []).map((m) => {
        const u = m.users as any
        return {
          userId: m.user_id,
          displayName: u?.display_name || 'Unknown',
          avatarUrl: u?.avatar_url,
          role: m.role as 'admin' | 'member',
          balance: m.balance,
          joinedAt: m.joined_at,
        }
      }),
    }
  },

  // Subscribe to group changes
  subscribeToGroup(groupId: string, callback: (group: Group | null) => void) {
    // Demo mode - no real-time updates, just return a no-op cleanup
    if (isDemoMode()) {
      // Initial callback with current data
      demoGroupsService.getGroup(groupId).then(callback)
      return () => {}
    }

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        async () => {
          const group = await this.getGroupWithMembers(groupId)
          callback(group)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        async () => {
          const group = await this.getGroupWithMembers(groupId)
          callback(group)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },
}

// Expenses Service
export const expensesService = {
  // Create expense with splits
  async create(
    groupId: string,
    description: string,
    amount: number,
    category: string,
    paidBy: string,
    splits: { userId: string; amount: number }[]
  ): Promise<Expense | null> {
    // Demo mode
    if (isDemoMode()) {
      const newExpense = await demoExpensesService.addExpense({
        groupId,
        description,
        amount,
        category: category as Expense['category'],
        paidBy: paidBy,
        splits: splits.map(s => ({
          userId: s.userId,
          amount: s.amount,
          isPaid: s.userId === paidBy,
        })),
      })

      return {
        id: newExpense.id,
        groupId: newExpense.groupId,
        description: newExpense.description,
        amount: newExpense.amount,
        category: newExpense.category,
        paidBy: paidBy,
        splits: splits.map(s => ({ ...s, isPaid: s.userId === paidBy })),
        createdAt: newExpense.createdAt,
      }
    }

    // Insert expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        description,
        amount,
        category,
        paid_by: paidBy,
      })
      .select()
      .single()

    if (error || !expense) return null

    // Insert splits
    const splitsToInsert = splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount: s.amount,
      is_paid: s.userId === paidBy,
    }))

    await supabase.from('expense_splits').insert(splitsToInsert)

    // Update balances for group members
    for (const split of splits) {
      if (split.userId !== paidBy) {
        // Debtor owes money
        await supabase.rpc('update_balance', {
          p_group_id: groupId,
          p_user_id: split.userId,
          p_amount: -split.amount,
        })
        // Payer is owed money
        await supabase.rpc('update_balance', {
          p_group_id: groupId,
          p_user_id: paidBy,
          p_amount: split.amount,
        })
      }
    }

    return {
      id: expense.id,
      groupId: expense.group_id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category as Expense['category'],
      paidBy: expense.paid_by,
      splits: splits.map((s) => ({
        ...s,
        isPaid: s.userId === paidBy,
      })),
      createdAt: expense.created_at,
    }
  },

  // Get group expenses
  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    // Demo mode
    if (isDemoMode()) {
      return demoExpensesService.getExpenses(groupId)
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_splits (
          user_id,
          amount,
          is_paid
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error || !expenses) return []

    return expenses.map((e) => ({
      id: e.id,
      groupId: e.group_id,
      description: e.description,
      amount: e.amount,
      category: e.category as Expense['category'],
      paidBy: e.paid_by,
      receiptUrl: e.receipt_url || undefined,
      notes: e.notes || undefined,
      splits: (e.expense_splits || []).map((s: any) => ({
        userId: s.user_id,
        amount: s.amount,
        isPaid: s.is_paid,
      })),
      createdAt: e.created_at,
    }))
  },

  // Get user's expenses across all groups
  async getUserExpenses(userId: string): Promise<Expense[]> {
    // Demo mode
    if (isDemoMode()) {
      return demoExpensesService.getAllExpenses()
    }

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_splits!inner (
          user_id,
          amount,
          is_paid
        )
      `)
      .eq('expense_splits.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !expenses) return []

    return expenses.map((e) => ({
      id: e.id,
      groupId: e.group_id,
      description: e.description,
      amount: e.amount,
      category: e.category as Expense['category'],
      paidBy: e.paid_by,
      splits: (e.expense_splits || []).map((s: any) => ({
        userId: s.user_id,
        amount: s.amount,
        isPaid: s.is_paid,
      })),
      createdAt: e.created_at,
    }))
  },

  // Subscribe to group expenses
  subscribeToGroupExpenses(groupId: string, callback: (expenses: Expense[]) => void) {
    // Demo mode - no real-time updates
    if (isDemoMode()) {
      demoExpensesService.getExpenses(groupId).then(callback)
      return () => {}
    }

    const channel = supabase
      .channel(`expenses:${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` },
        async () => {
          const expenses = await this.getGroupExpenses(groupId)
          callback(expenses)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  // Delete expense
  async delete(expenseId: string): Promise<boolean> {
    // Demo mode
    if (isDemoMode()) {
      await demoExpensesService.deleteExpense(expenseId)
      return true
    }

    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
    return !error
  },
}

// Payments Service
export const paymentsService = {
  // Record a payment
  async create(
    groupId: string,
    fromUser: string,
    toUser: string,
    amount: number,
    method?: string,
    notes?: string
  ): Promise<Payment | null> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        group_id: groupId,
        from_user: fromUser,
        to_user: toUser,
        amount,
        method,
        notes,
      })
      .select()
      .single()

    if (error || !payment) return null

    // Update balances
    await supabase.rpc('update_balance', {
      p_group_id: groupId,
      p_user_id: fromUser,
      p_amount: amount,
    })
    await supabase.rpc('update_balance', {
      p_group_id: groupId,
      p_user_id: toUser,
      p_amount: -amount,
    })

    return {
      id: payment.id,
      groupId: payment.group_id,
      fromUserId: payment.from_user,
      toUserId: payment.to_user,
      amount: payment.amount,
      method: payment.method || undefined,
      notes: payment.notes || undefined,
      createdAt: payment.created_at,
    }
  },

  // Get group payments
  async getGroupPayments(groupId: string): Promise<Payment[]> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (error || !payments) return []

    return payments.map((p) => ({
      id: p.id,
      groupId: p.group_id,
      fromUserId: p.from_user,
      toUserId: p.to_user,
      amount: p.amount,
      method: p.method || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
    }))
  },
}

// Budget Service
export const budgetService = {
  // Get or create user budget
  async getUserBudget(userId: string) {
    // Demo mode
    if (isDemoMode()) {
      const stored = localStorage.getItem('demo-budget')
      if (stored) {
        return JSON.parse(stored)
      }
      const defaultBudget = {
        id: 'demo-budget-1',
        userId: DEMO_USER_ID,
        monthlyLimit: 15000,
        categories: {
          food: 5000,
          utilities: 2000,
          travel: 3000,
          entertainment: 2000,
          shopping: 2000,
          health: 1000,
        },
      }
      localStorage.setItem('demo-budget', JSON.stringify(defaultBudget))
      return defaultBudget
    }

    let { data: budget } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!budget) {
      const { data: newBudget } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          monthly_limit: 10000,
          categories: {},
        })
        .select()
        .single()
      budget = newBudget
    }

    return budget
      ? {
          id: budget.id,
          userId: budget.user_id,
          monthlyLimit: budget.monthly_limit,
          categories: budget.categories as Record<string, number>,
        }
      : null
  },

  // Update budget
  async updateBudget(userId: string, monthlyLimit: number, categories?: Record<string, number>) {
    // Demo mode
    if (isDemoMode()) {
      const budget = {
        id: 'demo-budget-1',
        userId: DEMO_USER_ID,
        monthlyLimit,
        categories: categories || {},
      }
      localStorage.setItem('demo-budget', JSON.stringify(budget))
      return true
    }

    const { error } = await supabase
      .from('budgets')
      .update({
        monthly_limit: monthlyLimit,
        categories: categories || {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return !error
  },
}
