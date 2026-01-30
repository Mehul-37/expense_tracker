// Demo mode data service using localStorage
import type { Group, Expense, Payment, GroupMember } from '@/types'

const STORAGE_KEYS = {
  GROUPS: 'demo-groups',
  EXPENSES: 'demo-expenses',
  PAYMENTS: 'demo-payments',
  GROUP_MEMBERS: 'demo-group-members',
}

// Demo user ID
export const DEMO_USER_ID = 'demo-user-123'

// Demo group members (fake roommates)
export const DEMO_MEMBERS = [
  { id: DEMO_USER_ID, displayName: 'Demo User', email: 'demo@example.com' },
  { id: 'demo-user-2', displayName: 'Rahul Sharma', email: 'rahul@example.com' },
  { id: 'demo-user-3', displayName: 'Priya Patel', email: 'priya@example.com' },
  { id: 'demo-user-4', displayName: 'Amit Kumar', email: 'amit@example.com' },
]

// Helper to generate UUID
function generateId(): string {
  return 'demo-' + Math.random().toString(36).substr(2, 9)
}

// Initialize demo data with sample content
export function initializeDemoData() {
  // Check if already initialized
  if (localStorage.getItem(STORAGE_KEYS.GROUPS)) {
    return
  }

  // Create a sample group
  const sampleGroup: Group = {
    id: 'demo-group-1',
    name: 'Room 304 - Hostel',
    description: 'Our hostel room expenses',
    type: 'hostel',
    currency: 'INR',
    inviteCode: 'DEMO123',
    createdBy: DEMO_USER_ID,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    members: DEMO_MEMBERS.map((m, i): GroupMember => ({
      userId: m.id,
      displayName: m.displayName,
      role: i === 0 ? 'admin' : 'member',
      balance: 0,
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    })),
  }

  // Create sample expenses
  const sampleExpenses: Expense[] = [
    {
      id: 'demo-expense-1',
      groupId: 'demo-group-1',
      description: 'Dinner at Dominos',
      amount: 1200,
      category: 'food',
      paidBy: DEMO_USER_ID,
      splits: DEMO_MEMBERS.map(m => ({
        userId: m.id,
        amount: 300,
        isPaid: m.id === DEMO_USER_ID,
      })),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-expense-2',
      groupId: 'demo-group-1',
      description: 'Electricity Bill - January',
      amount: 2000,
      category: 'utilities',
      paidBy: 'demo-user-2',
      splits: DEMO_MEMBERS.map(m => ({
        userId: m.id,
        amount: 500,
        isPaid: m.id === 'demo-user-2',
      })),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-expense-3',
      groupId: 'demo-group-1',
      description: 'Groceries from BigBasket',
      amount: 800,
      category: 'shopping',
      paidBy: 'demo-user-3',
      splits: DEMO_MEMBERS.map(m => ({
        userId: m.id,
        amount: 200,
        isPaid: m.id === 'demo-user-3',
      })),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-expense-4',
      groupId: 'demo-group-1',
      description: 'Netflix Subscription',
      amount: 649,
      category: 'entertainment',
      paidBy: DEMO_USER_ID,
      splits: DEMO_MEMBERS.map(m => ({
        userId: m.id,
        amount: 162.25,
        isPaid: m.id === DEMO_USER_ID,
      })),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-expense-5',
      groupId: 'demo-group-1',
      description: 'Weekend Trip to Lonavala',
      amount: 4000,
      category: 'travel',
      paidBy: 'demo-user-4',
      splits: DEMO_MEMBERS.map(m => ({
        userId: m.id,
        amount: 1000,
        isPaid: m.id === 'demo-user-4',
      })),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  // Calculate balances
  const balances: Record<string, number> = {}
  DEMO_MEMBERS.forEach(m => balances[m.id] = 0)

  sampleExpenses.forEach(expense => {
    const payerId = expense.paidBy
    balances[payerId] += expense.amount
    expense.splits.forEach(split => {
      balances[split.userId] -= split.amount
    })
  })

  // Update group members with calculated balances
  sampleGroup.members = sampleGroup.members.map(m => ({
    ...m,
    balance: balances[m.userId] || 0,
  }))

  // Save to localStorage
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([sampleGroup]))
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(sampleExpenses))
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]))
}

// Check if in demo mode
export function isDemoMode(): boolean {
  return localStorage.getItem('demo-mode') === 'true'
}

// Groups operations
export const demoGroupsService = {
  async getGroups(): Promise<Group[]> {
    const data = localStorage.getItem(STORAGE_KEYS.GROUPS)
    return data ? JSON.parse(data) : []
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const groups = await this.getGroups()
    return groups.find(g => g.id === groupId) || null
  },

  async createGroup(name: string, description: string, type: string): Promise<Group> {
    const groups = await this.getGroups()
    const newGroup: Group = {
      id: generateId(),
      name,
      description,
      type: type as Group['type'],
      currency: 'INR',
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      createdBy: DEMO_USER_ID,
      createdAt: new Date().toISOString(),
      members: [{
        userId: DEMO_USER_ID,
        displayName: 'Demo User',
        role: 'admin',
        balance: 0,
        joinedAt: new Date().toISOString(),
      }],
    }
    groups.push(newGroup)
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))
    return newGroup
  },

  async joinGroup(inviteCode: string): Promise<Group | null> {
    const groups = await this.getGroups()
    const group = groups.find(g => g.inviteCode.toLowerCase() === inviteCode.toLowerCase())
    if (!group) return null

    // Check if already a member
    if (group.members.some(m => m.userId === DEMO_USER_ID)) {
      return group
    }

    // Add as member
    group.members.push({
      userId: DEMO_USER_ID,
      displayName: 'Demo User',
      role: 'member',
      balance: 0,
      joinedAt: new Date().toISOString(),
    })

    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))
    return group
  },

  async deleteGroup(groupId: string): Promise<void> {
    let groups = await this.getGroups()
    groups = groups.filter(g => g.id !== groupId)
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))

    // Also delete related expenses
    const allExpenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]')
    const filteredExpenses = allExpenses.filter((e: Expense) => e.groupId !== groupId)
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(filteredExpenses))
  },
}

// Expenses operations
export const demoExpensesService = {
  async getExpenses(groupId: string): Promise<Expense[]> {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES)
    const expenses: Expense[] = data ? JSON.parse(data) : []
    return expenses.filter(e => e.groupId === groupId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  },

  async getAllExpenses(): Promise<Expense[]> {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES)
    return data ? JSON.parse(data) : []
  },

  async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const expenses = await this.getAllExpenses()
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    expenses.push(newExpense)
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses))

    // Update group balances
    await this.updateGroupBalances(expense.groupId)

    return newExpense
  },

  async deleteExpense(expenseId: string): Promise<void> {
    let expenses = await this.getAllExpenses()
    const expense = expenses.find(e => e.id === expenseId)
    expenses = expenses.filter(e => e.id !== expenseId)
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses))

    // Update group balances
    if (expense) {
      await this.updateGroupBalances(expense.groupId)
    }
  },

  async updateGroupBalances(groupId: string): Promise<void> {
    const groups = await demoGroupsService.getGroups()
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    const expenses = await this.getExpenses(groupId)
    const balances: Record<string, number> = {}
    group.members.forEach(m => balances[m.userId] = 0)

    expenses.forEach(expense => {
      const payerId = expense.paidBy
      if (balances[payerId] !== undefined) {
        balances[payerId] += expense.amount
      }
      expense.splits.forEach(split => {
        if (balances[split.userId] !== undefined) {
          balances[split.userId] -= split.amount
        }
      })
    })

    // Update group members with calculated balances
    group.members = group.members.map(m => ({
      ...m,
      balance: balances[m.userId] || 0,
    }))

    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))
  },
}

// Payments operations
export const demoPaymentsService = {
  async getPayments(groupId: string): Promise<Payment[]> {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS)
    const payments: Payment[] = data ? JSON.parse(data) : []
    return payments.filter(p => p.groupId === groupId)
  },

  async addPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS)
    const payments: Payment[] = data ? JSON.parse(data) : []
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    payments.push(newPayment)
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments))
    return newPayment
  },
}

// Clear all demo data
export function clearDemoData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key)
  })
  localStorage.removeItem('demo-mode')
  localStorage.removeItem('demo-user')
  localStorage.removeItem('demo-budget')
}
