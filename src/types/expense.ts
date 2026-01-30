export type ExpenseCategory =
  | 'food'
  | 'utilities'
  | 'travel'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'miscellaneous'

export type SplitType = 'equal' | 'exact' | 'percentage'

export interface Split {
  userId: string
  amount: number
  isPaid: boolean
}

export interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  category: ExpenseCategory
  paidBy: string
  receiptUrl?: string
  notes?: string
  splits: Split[]
  createdAt: string
}

export interface ExpenseFormData {
  description: string
  amount: number
  category: ExpenseCategory
  paidBy: string
  splitType: SplitType
  splitWith: string[]
  notes?: string
}
