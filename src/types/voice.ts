import type { ExpenseCategory, SplitType } from './expense'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error'

export interface ParsedExpense {
  description: string
  amount: number
  category: ExpenseCategory
  paidBy: string
  splitWith: string[]
  splitType: SplitType
  confidence: number
}

export type VoiceCommand =
  | { type: 'add_expense'; data: ParsedExpense }
  | { type: 'query'; query: string }
  | { type: 'action'; action: 'settle_up' | 'view_balance' | 'show_expenses' }
  | { type: 'analysis'; request: string }
