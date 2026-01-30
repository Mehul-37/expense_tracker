import {
  Utensils,
  Zap,
  Car,
  PartyPopper,
  ShoppingBag,
  Heart,
  GraduationCap,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory } from '@/types'

export interface CategoryInfo {
  id: ExpenseCategory
  label: string
  icon: LucideIcon
  emoji: string
  color: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'food', label: 'Food & Dining', icon: Utensils, emoji: '🍔', color: '#f97316' },
  { id: 'utilities', label: 'Utilities', icon: Zap, emoji: '⚡', color: '#3b82f6' },
  { id: 'travel', label: 'Travel', icon: Car, emoji: '🚗', color: '#22c55e' },
  { id: 'entertainment', label: 'Entertainment', icon: PartyPopper, emoji: '🎉', color: '#a855f7' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, emoji: '🛍️', color: '#eab308' },
  { id: 'health', label: 'Health', icon: Heart, emoji: '🏥', color: '#ef4444' },
  { id: 'education', label: 'Education', icon: GraduationCap, emoji: '📚', color: '#06b6d4' },
  { id: 'miscellaneous', label: 'Other', icon: MoreHorizontal, emoji: '📝', color: '#737373' },
]

export const getCategoryInfo = (categoryId: ExpenseCategory): CategoryInfo => {
  return (
    CATEGORIES.find((c) => c.id === categoryId) ||
    CATEGORIES[CATEGORIES.length - 1]
  )
}

export const getCategoryColor = (categoryId: ExpenseCategory): string => {
  return getCategoryInfo(categoryId).color
}

export const getCategoryIcon = (categoryId: ExpenseCategory): LucideIcon => {
  return getCategoryInfo(categoryId).icon
}
