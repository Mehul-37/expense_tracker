import { create } from 'zustand'
import type { Group, GroupMember } from '@/types'

interface GroupState {
  groups: Group[]
  activeGroup: Group | null
  members: Record<string, GroupMember[]> // groupId -> members
  isLoading: boolean
  error: string | null

  // Actions
  setGroups: (groups: Group[]) => void
  setActiveGroup: (group: Group | null) => void
  addGroup: (group: Group) => void
  updateGroup: (id: string, updates: Partial<Group>) => void
  removeGroup: (id: string) => void
  setMembers: (groupId: string, members: GroupMember[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useGroupStore = create<GroupState>((set) => ({
  groups: [],
  activeGroup: null,
  members: {},
  isLoading: false,
  error: null,

  setGroups: (groups) => set({ groups, isLoading: false }),

  setActiveGroup: (activeGroup) => set({ activeGroup }),

  addGroup: (group) =>
    set((state) => ({
      groups: [group, ...state.groups],
    })),

  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
      activeGroup:
        state.activeGroup?.id === id
          ? { ...state.activeGroup, ...updates }
          : state.activeGroup,
    })),

  removeGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      activeGroup: state.activeGroup?.id === id ? null : state.activeGroup,
    })),

  setMembers: (groupId, members) =>
    set((state) => ({
      members: { ...state.members, [groupId]: members },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
}))

export default useGroupStore
