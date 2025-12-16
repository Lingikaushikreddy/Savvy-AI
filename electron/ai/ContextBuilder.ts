import { Message } from '../../src/types/chat'
import { OCRResult, ContextType as OCRContextType } from '../capture/OCRProcessor'
import { TranscriptResult } from '../audio/WhisperClient'

export type MeetingType = 'TECHNICAL_INTERVIEW' | 'SALES_CALL' | 'GENERAL_MEETING' | 'PRESENTATION'

export interface ScreenContext {
    text: string
    application: string
    contextType: OCRContextType
    detectedElements: string[]
}

export interface ConversationContext {
    recentMessages: Message[]
    currentSpeaker: 'Me' | 'Them'
    lastQuestion: string | null
    conversationFlow: string[] // Simplified node flow
}

export interface ContextMetadata {
    meetingType: MeetingType
    duration: number
    participants: string[]
    topics: string[]
}

export interface Context {
    screen: ScreenContext
    conversation: ConversationContext
    metadata: ContextMetadata
    prompt: string
}

export class ContextBuilder {
    private history: Message[] = []
    private maxHistoryTokens: number = 2000 // Approximate limit

    constructor() { }

    public addToHistory(message: Message): void {
        this.history.push(message)
        // Keep history manageable
        if (this.history.length > 50) {
            this.history = this.history.slice(-50)
        }
    }

    public clearHistory(): void {
        this.history = []
    }

    public extractCurrentQuestion(): string | null {
        // Heuristic: Look for last message from 'user' that ends with '?'
        // Or if we have audio transcript from 'Them' that is a question.
        // For now, let's look at recent history.
        const lastUserMsg = [...this.history].reverse().find(m => m.role === 'user')
        if (lastUserMsg && lastUserMsg.content.trim().endsWith('?')) {
            return lastUserMsg.content
        }
        return null
    }

    public detectMeetingType(screen: OCRResult, audio?: TranscriptResult): MeetingType {
        // Heuristics based on context
        let scoreTech = 0
        let scoreSales = 0
        let scorePresentation = 0

        // Screen Signals
        if (screen.detectedContext === 'CODE_EDITOR') scoreTech += 3
        if (screen.detectedContext === 'TERMINAL') scoreTech += 2
        if (screen.detectedContext === 'PRESENTATION') scorePresentation += 3
        if (screen.detectedContext === 'BROWSER') {
            if (screen.text.includes('CRM') || screen.text.includes('Pricing')) scoreSales += 2
        }

        // Audio Signals
        if (audio) {
            const text = audio.text.toLowerCase()
            if (text.includes('algorithm') || text.includes('function') || text.includes('deploy')) scoreTech += 2
            if (text.includes('timeline') || text.includes('budget') || text.includes('contract')) scoreSales += 2
            if (text.includes('slide') || text.includes('next page')) scorePresentation += 2
        }

        if (scoreTech > scoreSales && scoreTech > scorePresentation) return 'TECHNICAL_INTERVIEW'
        if (scoreSales > scoreTech && scoreSales > scorePresentation) return 'SALES_CALL'
        if (scorePresentation > scoreTech && scorePresentation > scoreSales) return 'PRESENTATION'

        return 'GENERAL_MEETING'
    }

    public buildContext(
        screen: OCRResult,
        audio: TranscriptResult | null,
        history: Message[] = this.history
    ): Context {
        const meetingType = this.detectMeetingType(screen, audio || undefined)
        const currentQuestion = this.extractCurrentQuestion()

        // Synthesize Screen Context
        const screenContext: ScreenContext = {
            text: screen.text,
            application: screen.detectedContext, // Mapping detectedContext to application broadly
            contextType: screen.detectedContext,
            detectedElements: screen.regions.map(r => r.text.substring(0, 20)) // Just snippets
        }

        // Synthesize Conversation Context
        const conversationContext: ConversationContext = {
            recentMessages: history.slice(-5), // Last 5 messages
            currentSpeaker: 'Me', // Default/Stub
            lastQuestion: currentQuestion,
            conversationFlow: []
        }

        // Synthesize Metadata
        const metadata: ContextMetadata = {
            meetingType,
            duration: audio ? audio.duration : 0,
            participants: ['Me', 'Them'], // Stub
            topics: [] // Would need topic extraction
        }

        // Build Prompt
        const prompt = this.formatPrompt(screenContext, conversationContext, metadata, audio)

        return {
            screen: screenContext,
            conversation: conversationContext,
            metadata,
            prompt
        }
    }

    private formatPrompt(
        screen: ScreenContext,
        conv: ConversationContext,
        meta: ContextMetadata,
        audio: TranscriptResult | null
    ): string {
        let prompt = `You are Savvy AI, an intelligent assistant.`
        prompt += `\n\nContext: ${meta.meetingType.replace('_', ' ')}`

        prompt += `\n\n=== SCREEN CONTEXT ===`
        prompt += `\nApp: ${screen.application}`
        prompt += `\nContent:\n${screen.text.substring(0, 1000)}... (truncated)` // Limit length

        if (audio) {
            prompt += `\n\n=== AUDIO CONTEXT ===`
            prompt += `\nTranscript: ${audio.text}`
        }

        prompt += `\n\n=== CONVERSATION HISTORY ===`
        if (conv.recentMessages.length === 0) {
            prompt += `\n(No recent conversation)`
        } else {
            conv.recentMessages.forEach(msg => {
                prompt += `\n${msg.role}: ${msg.content}`
            })
        }

        prompt += `\n\nYour Goal: Assist the user based on the context above.`
        return prompt
    }
}
