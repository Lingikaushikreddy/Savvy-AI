
import { create } from 'zustand'

export type AppState = 'idle' | 'listening' | 'processing' | 'ready' | 'error'

export interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

interface AppStore {
    // UI State
    isExpanded: boolean
    isVisible: boolean
    toggleExpanded: () => void
    toggleVisibility: () => void
    setExpanded: (expanded: boolean) => void

    // Processing State
    status: AppState
    setStatus: (status: AppState) => void
    error: string | null
    setError: (error: string | null) => void

    // Chat Data
    messages: Message[]
    currentResponse: string // For streaming
    addMessage: (msg: Message) => void
    updateCurrentResponse: (text: string) => void
    clearData: () => void

    // Actions
    triggerAI: () => void // Just state, effect handled in App
}

export const useAppStore = create<AppStore>((set) => ({
    isExpanded: true, // Default to expanded initially to show greetings
    isVisible: true,
    toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
    toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
    setExpanded: (expanded) => set({ isExpanded: expanded }),

    status: 'idle',
    setStatus: (status) => set({ status }),
    error: null,
    setError: (error) => set({ error }),

    messages: [],
    currentResponse: '',
    addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
    updateCurrentResponse: (text) => set({ currentResponse: text }),
    clearData: () => set({ messages: [], currentResponse: '', status: 'idle', error: null }),

    triggerAI: () => {
        /* logic to be hooked via effects or subscribers */
    }
}))
