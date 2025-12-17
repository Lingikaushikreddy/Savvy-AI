import { LLMHelper } from '../LLMHelper'
import {
    MeetingType,
    MeetingPhase,
    KeyMoment,
    Prediction,
    ContextAnalysis
} from '../../src/shared/ipc-types'

interface DetectionRule {
    type: MeetingType
    keywords: string[]
    negativeKeywords?: string[]
    requiredPatterns?: RegExp[]
}

export class ContextAnalyzer {
    private history: string[] = []
    private currentType: MeetingType = 'UNKNOWN'
    private confidence: number = 0

    // Detection Rules Configuration
    private readonly RULES: DetectionRule[] = [
        {
            type: 'TECHNICAL_INTERVIEW',
            keywords: ['algorithm', 'complexity', 'optimize', 'implement', 'database', 'system design', 'big o', 'latency', 'throughput'],
            requiredPatterns: [/how would you/i, /write a function/i, /design a/i]
        },
        {
            type: 'BEHAVIORAL_INTERVIEW',
            keywords: ['situation', 'task', 'action', 'result', 'tell me about a time', 'conflict', 'challenge', 'weakness', 'strength'],
            requiredPatterns: [/tell me about/i, /describe a/i]
        },
        {
            type: 'SALES_CALL',
            keywords: ['pricing', 'roi', 'contract', 'timeline', 'budget', 'stakeholder', 'implementation', 'cost', 'value property'],
            requiredPatterns: [/too expensive/i, /not sure/i, /send me a/i]
        },
        {
            type: 'VC_PITCH',
            keywords: ['market size', 'traction', 'burn rate', 'valuation', 'go-to-market', 'cac', 'ltv', 'seed', 'series a'],
        },
        {
            type: 'GENERAL_MEETING',
            keywords: ['agenda', 'action items', 'follow up', 'next steps', 'sync', 'update'],
        }
    ]

    constructor(private llmHelper?: LLMHelper) { }

    public async analyzeContext(
        transcriptText: string,
        screenText: string = ''
    ): Promise<ContextAnalysis> {

        // 1. Detect Meeting Type
        const { type, confidence } = this.classifyMeetingType(transcriptText, screenText)
        this.currentType = type
        this.confidence = confidence

        // 2. Detect Phase (Simple heuristic based on duration or keywords, mocking for now)
        const phase = this.detectPhase(transcriptText)

        // 3. Detect Key Moments
        const moments = this.detectKeyMoments(transcriptText)

        // 4. Generate Predictions
        const predictions = this.predictNext(type, moments)

        return {
            meetingType: type,
            confidence,
            currentPhase: phase,
            detectedMoments: moments,
            predictions,
            suggestions: this.generateSuggestions(type, moments, predictions)
        }
    }

    private classifyMeetingType(transcript: string, screen: string): { type: MeetingType, confidence: number } {
        const text = (transcript + ' ' + screen).toLowerCase()
        let bestMatch: MeetingType = 'UNKNOWN'
        let maxScore = 0

        for (const rule of this.RULES) {
            let score = 0

            // Keyword matching
            rule.keywords.forEach(kw => {
                if (text.includes(kw.toLowerCase())) score += 1
            })

            // Pattern matching
            if (rule.requiredPatterns) {
                rule.requiredPatterns.forEach(pattern => {
                    if (pattern.test(text)) score += 3 // Patterns imply stronger intent
                })
            }

            // Context-specific boosts
            if (rule.type === 'TECHNICAL_INTERVIEW' && (text.includes('code') || screen.includes('function') || screen.includes('class'))) {
                score += 2
            }
            if (rule.type === 'VC_PITCH' && (screen.includes('traction') || screen.includes('revenue'))) {
                score += 2
            }

            if (score > maxScore) {
                maxScore = score
                bestMatch = rule.type
            }
        }

        // Heuristic confidence calculation
        const confidence = Math.min(1.0, maxScore / 5)

        return {
            type: maxScore > 2 ? bestMatch : 'GENERAL_MEETING', // Default fallback
            confidence
        }
    }

    private detectPhase(text: string): MeetingPhase {
        const lower = text.toLowerCase()
        if (lower.includes('agenda') || lower.includes('welcome')) return 'INTRO'
        if (lower.includes('any questions') || lower.includes('ask me anything')) return 'Q_AND_A'
        if (lower.includes('next steps') || lower.includes('thank you for time')) return 'CLOSING'
        return 'MAIN_DISCUSSION'
    }

    private detectKeyMoments(text: string): KeyMoment[] {
        const moments: KeyMoment[] = []
        const tokenizer = new Intl.Segmenter('en', { granularity: 'sentence' })
        const sentences = Array.from(tokenizer.segment(text))

        // Analyze last few sentences for key moments
        const recentSentences = sentences.slice(-3) // Look at recent context

        for (const { segment } of recentSentences) {
            const lower = segment.toLowerCase()

            // Question Detection
            if (segment.trim().endsWith('?') || lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why')) {
                moments.push({
                    type: 'QUESTION',
                    content: segment,
                    timestamp: Date.now(),
                    confidence: 0.8,
                    metadata: { subtype: this.classifyQuestionType(segment) }
                })
            }

            // Objection Detection
            if (lower.includes('too expensive') || lower.includes('not sure') || lower.includes('concerns')) {
                moments.push({
                    type: 'OBJECTION',
                    content: segment,
                    timestamp: Date.now(),
                    confidence: 0.85,
                    metadata: { subtype: 'RESISTANCE' }
                })
            }

            // Decision Detection
            if (lower.includes('sounds good') || lower.includes('let\'s do it') || lower.includes('agree')) {
                moments.push({
                    type: 'DECISION',
                    content: segment,
                    timestamp: Date.now(),
                    confidence: 0.9,
                    metadata: { subtype: 'AGREEMENT' }
                })
            }
        }

        return moments
    }

    private classifyQuestionType(q: string): string {
        if (q.match(/how|implement|code|complexity/i)) return 'TECHNICAL'
        if (q.match(/tell me about|situation|example/i)) return 'BEHAVIORAL'
        return 'GENERAL'
    }

    private predictNext(type: MeetingType, moments: KeyMoment[]): Prediction[] {
        const predictions: Prediction[] = []

        // Simple heuristic predictions based on meeting type
        if (type === 'TECHNICAL_INTERVIEW') {
            const hasComplexityQ = moments.some(m => m.content.includes('complexity') || m.content.includes('Big O'))
            if (!hasComplexityQ) {
                predictions.push({
                    type: 'NEXT_QUESTION',
                    content: "What is the time and space complexity?",
                    probability: 0.8,
                    preparedness: 0.9
                })
            }
        } else if (type === 'BEHAVIORAL_INTERVIEW') {
            predictions.push({
                type: 'NEXT_QUESTION',
                content: "What was the result of your actions?",
                probability: 0.7,
                preparedness: 1.0
            })
        } else if (type === 'SALES_CALL') {
            predictions.push({
                type: 'NEXT_OBJECTION',
                content: "Budget/Pricing concerns",
                probability: 0.6,
                preparedness: 0.8
            })
        }

        return predictions
    }

    private generateSuggestions(type: MeetingType, moments: KeyMoment[], predictions: Prediction[]): string[] {
        const suggestions: string[] = []

        // React to moments
        moments.forEach(m => {
            if (m.type === 'QUESTION') {
                if (type === 'BEHAVIORAL_INTERVIEW') suggestions.push("Use STAR method: Situation, Task, Action, Result")
                if (type === 'TECHNICAL_INTERVIEW') suggestions.push("Clarify constraints before coding.")
            }
            if (m.type === 'OBJECTION') {
                suggestions.push("Acknowledge the concern, then pivot to value.")
            }
        })

        // Leverage predictions
        predictions.forEach(p => {
            if (p.probability > 0.7) {
                suggestions.push(`Prepare for: ${p.content}`)
            }
        })

        return suggestions
    }

    public extractIntentions(transcript: string): any[] {
        const intentions: any[] = []
        const lower = transcript.toLowerCase()
        if (lower.includes('schedule') || lower.includes('calendar')) intentions.push({ type: 'SCHEDULE_MEETING' })
        if (lower.includes('send') && lower.includes('email')) intentions.push({ type: 'SEND_EMAIL' })
        return intentions
    }

    // --- Public API Integration Points ---

    public async processStream(transcriptChunk: string, screenText: string) {
        if (!transcriptChunk) return null
        this.history.push(transcriptChunk)
        // Keep history manageable
        if (this.history.length > 50) this.history.shift()

        const fullContext = this.history.join(' ')
        return this.analyzeContext(fullContext, screenText)
    }
}
