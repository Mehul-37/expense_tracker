import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Users, ChevronRight, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { groupsService } from '@/services/supabase'
import type { Group } from '@/types'
import { cn } from '@/lib/utils'

const GROUP_TYPES = [
  { id: 'hostel', label: 'Hostel', emoji: '🏠' },
  { id: 'flat', label: 'Flat', emoji: '🏢' },
  { id: 'trip', label: 'Trip', emoji: '✈️' },
  { id: 'other', label: 'Other', emoji: '👥' },
]

export default function Groups() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState('hostel')
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadGroups = async () => {
      setIsLoading(true)
      const userGroups = await groupsService.getUserGroups(user.id)
      setGroups(userGroups)
      setIsLoading(false)
    }

    loadGroups()
  }, [user])

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const group = await groupsService.create(
        newGroupName.trim(),
        user.id,
        newGroupType
      )

      if (group) {
        setGroups((prev) => [group, ...prev])
        setIsCreateOpen(false)
        setNewGroupName('')
        setNewGroupType('hostel')
        navigate(`/groups/${group.id}`)
      } else {
        setError('Failed to create group')
      }
    } catch (err) {
      setError('Failed to create group')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!user || !inviteCode.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const group = await groupsService.joinByCode(inviteCode.trim(), user.id)

      if (group) {
        setGroups((prev) => [group, ...prev])
        setIsJoinOpen(false)
        setInviteCode('')
        navigate(`/groups/${group.id}`)
      } else {
        setError('Invalid invite code or already a member')
      }
    } catch (err) {
      setError('Failed to join group')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUserBalance = (group: Group) => {
    const member = group.members.find((m) => m.userId === user?.id)
    return member?.balance || 0
  }

  const getGroupEmoji = (type: string) => {
    return GROUP_TYPES.find((t) => t.id === type)?.emoji || '👥'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up stagger-1">
        <div>
          <h1 className="text-2xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage your expense groups</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Join Group</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg tracking-widest"
                  />
                </div>
                {error && (
                  <p className="text-sm text-danger">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsJoinOpen(false)
                    setInviteCode('')
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={!inviteCode.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Join
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    placeholder="e.g., Room 304, Weekend Trip"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GROUP_TYPES.map((type) => (
                      <Button
                        key={type.id}
                        variant="outline"
                        className={cn(
                          'justify-start',
                          newGroupType === type.id && 'border-primary bg-primary/10'
                        )}
                        onClick={() => setNewGroupType(type.id)}
                      >
                        <span className="mr-2">{type.emoji}</span>
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-danger">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false)
                    setNewGroupName('')
                    setNewGroupType('hostel')
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups List */}
      {groups.length > 0 ? (
        <div className="space-y-3 animate-fade-in-up stagger-2">
          {groups.map((group, index) => {
            const balance = getUserBalance(group)
            return (
              <Card
                key={group.id}
                className="cursor-pointer hover:bg-surface-hover transition-all hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 hover-glow"
                style={{ animationDelay: `${index * 0.08}s` }}
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                        {getGroupEmoji(group.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{group.members.length} members</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            balance > 0
                              ? 'text-success'
                              : balance < 0
                              ? 'text-danger'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {balance === 0
                            ? 'Settled'
                            : balance > 0
                            ? `+${formatCurrency(balance)}`
                            : formatCurrency(balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {balance > 0
                            ? 'owed to you'
                            : balance < 0
                            ? 'you owe'
                            : 'all clear'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a group with your roommates to start tracking shared expenses.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
                Join Group
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>Create Group</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
