import { create } from 'zustand'
import type { VoiceState, ParsedExpense } from '@/types'

interface VoiceStoreState {
  isActive: boolean
  state: VoiceState
  transcript: string
  interimTranscript: string
  parsedExpense: ParsedExpense | null
  error: string | null

  // Actions
  setActive: (active: boolean) => void
  setState: (state: VoiceState) => void
  setTranscript: (transcript: string) => void
  setInterimTranscript: (transcript: string) => void
  setParsedExpense: (expense: ParsedExpense | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  isActive: false,
  state: 'idle',
  transcript: '',
  interimTranscript: '',
  parsedExpense: null,
  error: null,

  setActive: (isActive) =>
    set({
      isActive,
      state: isActive ? 'listening' : 'idle',
      error: null,
    }),

  setState: (state) => set({ state }),

  setTranscript: (transcript) => set({ transcript }),

  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),

  setParsedExpense: (parsedExpense) =>
    set({
      parsedExpense,
      state: parsedExpense ? 'confirming' : 'idle',
    }),

  setError: (error) =>
    set({
      error,
      state: error ? 'error' : 'idle',
    }),

  reset: () =>
    set({
      isActive: false,
      state: 'idle',
      transcript: '',
      interimTranscript: '',
      parsedExpense: null,
      error: null,
    }),
}))

export default useVoiceStore
