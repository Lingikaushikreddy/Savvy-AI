
export interface AIQueryRequest {
    question: string
    context?: any // Additional context overrides
}

export interface ConversationFilter {
    limit?: number
    offset?: number
    meeting_type?: string
}

export interface SettingsMap {
    [key: string]: any
}

// Window API
export interface WindowApi {
    show: () => Promise<void>
    hide: () => Promise<void>
    toggle: () => Promise<void>
    move: (x: number, y: number) => Promise<void>
    resize: (width: number, height: number) => Promise<void>
}

// Capture API
export interface CaptureApi {
    start: () => Promise<void>
    stop: () => Promise<void>
    getStatus: () => Promise<'active' | 'inactive' | 'error'>
    requestPermissions: () => Promise<boolean>
}

// AI API
export interface AiApi {
    query: (question: string) => Promise<string>
    stream: (
        question: string,
        onChunk: (chunk: string) => void,
        onEnd: () => void
    ) => void
    stop: () => Promise<void>
    clearContext: () => Promise<void>
}

// Conversation API
export interface ConversationApi {
    create: (data: any) => Promise<string>
    get: (id: string) => Promise<any>
    list: (filters?: ConversationFilter) => Promise<any[]>
    delete: (id: string) => Promise<void>
    export: (id: string) => Promise<any>
}

// Settings API
export interface SettingsApi {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    getAll: () => Promise<SettingsMap>
    validateApiKey: (provider: string, key: string) => Promise<boolean>
}

// Main API interface exposed to window
export interface ElectronApi {
    window: WindowApi
    capture: CaptureApi
    ai: AiApi
    conversation: ConversationApi
    settings: SettingsApi
}
