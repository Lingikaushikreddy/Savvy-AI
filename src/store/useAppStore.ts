
import { create } from 'zustand'

export type AppState = 'idle' | 'listening' | 'processing' | 'ready' | 'error'

export interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

export interface Settings {
    general: {
        launchAtLogin: boolean
        startMinimized: boolean
        theme: 'dark' | 'light' | 'auto'
        hotkeyTrigger: string
        hotkeyHide: string
    }
    capture: {
        interval: number
        screenCaptureEnabled: boolean
        audioCaptureEnabled: boolean
        audioSourceId: string
    }
    ai: {
        provider: 'openai' | 'anthropic'
        model: string
        temperature: number
        maxTokens: number
        systemPrompt: string
    }
    playbook: {
        defaultPlaybookId: string
        autoDetect: boolean
    }
    apiKeys: {
        openai: string
        anthropic: string
    }
    privacy: {
        retentionDays: number | 'never'
    }
}

const defaultSettings: Settings = {
    general: {
        launchAtLogin: true,
        startMinimized: false,
        theme: 'dark',
        hotkeyTrigger: 'Cmd+Shift+A',
        hotkeyHide: 'Cmd+Shift+H'
    },
    capture: {
        interval: 2,
        screenCaptureEnabled: true,
        audioCaptureEnabled: true,
        audioSourceId: 'default'
    },
    ai: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are Savvy AI, a helpful desktop assistant.'
    },
    playbook: {
        defaultPlaybookId: 'GENERAL_MEETING',
        autoDetect: true
    },
    apiKeys: {
        openai: '',
        anthropic: ''
    },
    privacy: {
        retentionDays: 30
    }
}

interface AppStore {
    // UI State
    isExpanded: boolean
    isVisible: boolean
    isSettingsOpen: boolean
    toggleExpanded: () => void
    toggleVisibility: () => void
    toggleSettings: () => void
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

    // Settings
    settings: Settings
    updateSettings: (partial: Partial<Settings>) => void

    // Actions
    triggerAI: () => void
}

export const useAppStore = create<AppStore>((set) => ({
    isExpanded: true, // Default to expanded initially to show greetings
    isVisible: true,
    isSettingsOpen: false,
    toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
    toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
    toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
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

    settings: defaultSettings,
    updateSettings: (partial) => set((state) => ({
        settings: { ...state.settings, ...partial }
    })),

    triggerAI: () => {
        /* logic to be hooked via effects or subscribers */
    }
}))
