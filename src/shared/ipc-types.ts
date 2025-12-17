
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

// Context Analysis Types
export type MeetingType =
    | 'TECHNICAL_INTERVIEW'
    | 'BEHAVIORAL_INTERVIEW'
    | 'SALES_CALL'
    | 'VC_PITCH'
    | 'GENERAL_MEETING'
    | 'UNKNOWN'

export type MeetingPhase = 'INTRO' | 'MAIN_DISCUSSION' | 'Q_AND_A' | 'CLOSING' | 'FOLLOW_UP'

export interface KeyMoment {
    type: 'QUESTION' | 'OBJECTION' | 'DECISION' | 'TRANSITION'
    content: string
    timestamp: number
    confidence: number
    metadata: any
}

export interface Prediction {
    type: 'NEXT_QUESTION' | 'NEXT_TOPIC' | 'NEXT_OBJECTION'
    content: string
    probability: number
    preparedness: number // 0-1
}

export interface ContextAnalysis {
    meetingType: MeetingType
    confidence: number
    currentPhase: MeetingPhase
    detectedMoments: KeyMoment[]
    predictions: Prediction[]
    suggestions: string[]
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
    analyzeContext: (transcript: string, screenText: string) => Promise<ContextAnalysis>
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

// Shortcut API
export interface ShortcutConfig {
    key: string
    description: string
    action: string
    enabled: boolean
}

export type ShortcutMap = Record<string, ShortcutConfig>

export interface ShortcutApi {
    getAll: () => Promise<ShortcutMap>
    update: (action: string, key: string) => Promise<void>
    reset: () => Promise<void>
}

// Main API interface exposed to window
export interface ElectronApi {
    window: WindowApi
    capture: CaptureApi
    ai: AiApi
    conversation: ConversationApi
    settings: SettingsApi
    shortcuts: ShortcutApi
}

// Meeting Notes Types
export interface Decision {
    topic: string
    decision: string
    rationale: string
    decidedBy: string
}

export interface ActionItem {
    task: string
    assignee: string
    dueDate: string
    priority: 'high' | 'medium' | 'low'
    status: 'pending' | 'in-progress' | 'completed'
}

export interface MeetingNotes {
    title: string
    date: string
    duration: number
    participants: string[]
    summary: string
    keyPoints: string[]
    decisions: Decision[]
    actionItems: ActionItem[]
    nextSteps: string[]
    questions: string[]
}

export interface Email {
    subject: string
    body: string
    recipient?: string
    attachments?: string[]
}

export interface NotesApi {
    generate: (conversationId: string) => Promise<MeetingNotes>
    generateEmail: (conversationId: string, recipient?: string) => Promise<Email>
    getActionItems: (conversationId: string) => Promise<ActionItem[]>
    summarize: (conversationId: string, maxLength?: number) => Promise<string>
}

// Update ElectronApi
export interface ElectronApi {
    window: WindowApi
    capture: CaptureApi
    ai: AiApi
    conversation: ConversationApi
    settings: SettingsApi
    shortcuts: ShortcutApi
    notes: NotesApi
}
