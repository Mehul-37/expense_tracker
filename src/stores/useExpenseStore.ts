import { create } from 'zustand'
import type { Expense, ExpenseCategory } from '@/types'

interface ExpenseFilters {
  dateRange: 'week' | 'month' | 'year' | 'all'
  category: ExpenseCategory | null
  paidBy: string | null
}

interface ExpenseState {
  expenses: Record<string, Expense[]> // groupId -> expenses
  recentExpenses: Expense[]
  filters: ExpenseFilters
  isLoading: boolean
  error: string | null

  // Actions
  setExpenses: (groupId: string, expenses: Expense[]) => void
  addExpense: (expense: Expense) => void
  updateExpense: (id: string, groupId: string, updates: Partial<Expense>) => void
  deleteExpense: (id: string, groupId: string) => void
  setFilters: (filters: Partial<ExpenseFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const defaultFilters: ExpenseFilters = {
  dateRange: 'month',
  category: null,
  paidBy: null,
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: {},
  recentExpenses: [],
  filters: defaultFilters,
  isLoading: false,
  error: null,

  setExpenses: (groupId, expenses) =>
    set((state) => ({
      expenses: { ...state.expenses, [groupId]: expenses },
      isLoading: false,
    })),

  addExpense: (expense) =>
    set((state) => {
      const groupExpenses = state.expenses[expense.groupId] || []
      return {
        expenses: {
          ...state.expenses,
          [expense.groupId]: [expense, ...groupExpenses],
        },
        recentExpenses: [expense, ...state.recentExpenses.slice(0, 9)],
      }
    }),

  updateExpense: (id, groupId, updates) =>
    set((state) => {
      const groupExpenses = state.expenses[groupId] || []
      return {
        expenses: {
          ...state.expenses,
          [groupId]: groupExpenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        },
        recentExpenses: state.recentExpenses.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      }
    }),

  deleteExpense: (id, groupId) =>
    set((state) => {
      const groupExpenses = state.expenses[groupId] || []
      return {
        expenses: {
          ...state.expenses,
          [groupId]: groupExpenses.filter((e) => e.id !== id),
        },
        recentExpenses: state.recentExpenses.filter((e) => e.id !== id),
      }
    }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}))

export default useExpenseStore
