import type { ExpenseCategory } from './expense'

export interface CategoryBudget {
  limit: number
  spent: number
}

export interface BudgetGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: number
}

export interface Budget {
  monthlyLimit: number
  categories: Partial<Record<ExpenseCategory, CategoryBudget>>
  goals: BudgetGoal[]
}

export interface SpendingTrend {
  date: string
  amount: number
}

export interface CategorySpending {
  category: ExpenseCategory
  amount: number
  percentage: number
}
