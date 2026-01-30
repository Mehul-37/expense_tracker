import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  activeModal: string | null
  toasts: Toast[]

  // Actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (modal: string) => void
  closeModal: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: false,
      activeModal: null,
      toasts: [],

      setTheme: (theme) => {
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'system') {
          const prefersDark = window.matchMedia(
            '(prefers-color-scheme: dark)'
          ).matches
          root.classList.toggle('dark', prefersDark)
        } else {
          root.classList.toggle('dark', theme === 'dark')
        }
        set({ theme })
      },

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      openModal: (activeModal) => set({ activeModal }),

      closeModal: () => set({ activeModal: null }),

      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            { ...toast, id: Math.random().toString(36).slice(2) },
          ],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

export default useUIStore
