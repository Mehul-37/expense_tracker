import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, Users, Receipt, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/constants'
import type { ExpenseCategory, GroupMember } from '@/types'

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ExpenseFormData) => Promise<void>
  members: GroupMember[]
  currentUserId: string
}

interface ExpenseFormData {
  description: string
  amount: number
  category: ExpenseCategory
  paidBy: string
  splitType: 'equal' | 'exact'
  splits: { userId: string; amount: number }[]
}

export default function ExpenseForm({
  isOpen,
  onClose,
  onSubmit,
  members,
  currentUserId,
}: ExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitType, setSplitType] = useState<'equal' | 'exact'>('equal')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.userId)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || selectedMembers.length === 0) return

    setIsSubmitting(true)
    try {
      const amountNum = parseFloat(amount)
      const splitAmount = amountNum / selectedMembers.length

      await onSubmit({
        description,
        amount: amountNum,
        category,
        paidBy,
        splitType,
        splits: selectedMembers.map((userId) => ({
          userId,
          amount: splitAmount,
        })),
      })

      // Reset form
      setDescription('')
      setAmount('')
      setCategory('food')
      setPaidBy(currentUserId)
      setSelectedMembers(members.map((m) => m.userId))
      onClose()
    } catch (error) {
      console.error('Failed to create expense:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="sticky top-0 bg-card pt-3 pb-2 z-10">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 text-2xl h-14 font-bold"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <div className="relative">
                <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="What was this for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const CategoryIcon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as ExpenseCategory)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                        category === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface hover:bg-surface-hover'
                      )}
                    >
                      <CategoryIcon className="h-4 w-4" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Paid By */}
            <div className="space-y-2">
              <Label>Paid by</Label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {members.map((member) => (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => setPaidBy(member.userId)}
                    className={cn(
                      'flex-shrink-0 px-4 py-2 rounded-lg text-sm transition-colors',
                      paidBy === member.userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface hover:bg-surface-hover'
                    )}
                  >
                    {member.displayName}
                    {member.userId === currentUserId && ' (You)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Split With */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Split with</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      splitType === 'equal'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface'
                    )}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('exact')}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      splitType === 'exact'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface'
                    )}
                  >
                    Exact
                  </button>
                </div>
              </div>

              <Card>
                <CardContent className="p-3 space-y-2">
                  {members.map((member) => {
                    const isSelected = selectedMembers.includes(member.userId)
                    const splitAmount =
                      amount && isSelected
                        ? parseFloat(amount) / selectedMembers.length
                        : 0

                    return (
                      <div
                        key={member.userId}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer',
                          isSelected ? 'bg-surface' : 'opacity-50'
                        )}
                        onClick={() => toggleMember(member.userId)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center',
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            )}
                          >
                            {isSelected && (
                              <Users className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <span>{member.displayName}</span>
                        </div>
                        {isSelected && splitAmount > 0 && (
                          <span className="text-muted-foreground">
                            ₹{splitAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12"
              disabled={!description || !amount || selectedMembers.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
