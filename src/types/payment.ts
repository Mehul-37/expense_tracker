export type PaymentMethod = 'upi' | 'cash' | 'bank' | 'other'

export interface Payment {
  id: string
  groupId: string
  fromUserId: string
  toUserId: string
  amount: number
  method?: string
  notes?: string
  createdAt: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface Balance {
  userId: string
  amount: number // positive = owed money, negative = owes money
}
