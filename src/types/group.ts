export interface Group {
  id: string
  name: string
  description?: string
  type: 'hostel' | 'flat' | 'trip' | 'other'
  avatarUrl?: string
  currency: string
  inviteCode: string
  createdBy: string
  createdAt: string
  members: GroupMember[]
}

export interface GroupMember {
  userId: string
  displayName: string
  avatarUrl?: string
  role: 'admin' | 'member'
  balance: number
  joinedAt: string
}
