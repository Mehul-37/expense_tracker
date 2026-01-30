export type NotificationType =
  | 'expense_added'
  | 'payment_received'
  | 'payment_request'
  | 'group_invite'
  | 'reminder'
  | 'budget_alert'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  createdAt: number
}
