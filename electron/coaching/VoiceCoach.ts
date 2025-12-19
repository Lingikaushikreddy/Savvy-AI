
import { EventEmitter } from 'events'

export interface VoiceMetrics {
    timestamp: number
    volumeDb: number        // -60 to 0 dB
    wpm: number            // Words Per Minute
    sentiment: 'positive' | 'neutral' | 'negative'
    confidence: number     // 0-1
    fillerCount: number
    fillerRate: number     // Fillers per minute
    emotion?: string       // e.g., 'nervous', 'excited'
}

export interface CoachingTip {
    id: string
    type: 'pace' | 'volume' | 'filler' | 'emotion'
    message: string
    severity: 'info' | 'warning' | 'alert'
}

export class VoiceCoach extends EventEmitter {
    // Thresholds
    private readonly TARGET_WPM_MIN = 120
    private readonly TARGET_WPM_MAX = 160
    private readonly FILLER_THRESHOLD_PER_MIN = 5
    private readonly SILENCE_THRESHOLD_DB = -50

    // State
    private wordTimestamps: number[] = []
    private fillerTimestamps: number[] = []
    private recentVolumeSamples: number[] = []

    // Simple sentiment lexicon (can be replaced by ML model)
    private readonly POSITIVE_WORDS = new Set(['great', 'excellent', 'confident', 'sure', 'definitely', 'happy', 'excited', 'good'])
    private readonly NEGATIVE_WORDS = new Set(['bad', 'unsure', 'maybe', 'sorry', 'worried', 'nervous', 'afraid', 'terrible'])
    private readonly FILLER_WORDS = new Set(['um', 'uh', 'like', 'literally', 'you know', 'actually', 'basically'])

    constructor() {
        super()
    }

    /**
     * Analyze a chunk of raw audio data
     */
    public processAudio(buffer: Int16Array): number {
        // Calculate RMS
        let sum = 0
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i]
        }
        const rms = Math.sqrt(sum / buffer.length)
        const db = 20 * Math.log10(rms / 32768) // Normalize to 16-bit range

        this.recentVolumeSamples.push(db)
        if (this.recentVolumeSamples.length > 50) this.recentVolumeSamples.shift()

        return db
    }

    /**
     * Analyze a new transcript segment
     */
    public processTranscript(text: string): { wpm: number, fillers: number, sentiment: 'positive' | 'neutral' | 'negative' } {
        const now = Date.now()
        const words = text.toLowerCase().split(/\s+/)

        let newFillers = 0
        let sentimentScore = 0

        words.forEach(word => {
            // Track word timing for WPM
            this.wordTimestamps.push(now)

            // Check fillers
            if (this.FILLER_WORDS.has(word)) {
                this.fillerTimestamps.push(now)
                newFillers++
            }

            // Check sentiment
            if (this.POSITIVE_WORDS.has(word)) sentimentScore++
            if (this.NEGATIVE_WORDS.has(word)) sentimentScore--
        })

        // Clean up old timestamps (> 1 minute ago)
        this.cleanupTimestamps(now)

        return {
            wpm: this.calculateWPM(now),
            fillers: this.fillerTimestamps.length,
            sentiment: sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral'
        }
    }

    /**
     * Generate coaching tips based on current state
     */
    public getFeedback(metrics: Partial<VoiceMetrics>): CoachingTip[] {
        const tips: CoachingTip[] = []

        // Pace Check
        if (metrics.wpm) {
            if (metrics.wpm > this.TARGET_WPM_MAX) {
                tips.push({ id: 'pace-fast', type: 'pace', message: 'Slow down', severity: 'warning' })
            } else if (metrics.wpm < this.TARGET_WPM_MIN && metrics.wpm > 10) { // Ignore silence
                tips.push({ id: 'pace-slow', type: 'pace', message: 'Pick up the pace', severity: 'info' })
            }
        }

        // Filler Check
        if (metrics.fillerRate && metrics.fillerRate > this.FILLER_THRESHOLD_PER_MIN) {
            tips.push({ id: 'fillers', type: 'filler', message: 'Reduce filler words', severity: 'warning' })
        }

        // Volume Check
        if (metrics.volumeDb && metrics.volumeDb < -35 && metrics.volumeDb > -100) {
            tips.push({ id: 'vol-low', type: 'volume', message: 'Speak up', severity: 'info' })
        }

        return tips
    }

    private calculateWPM(now: number): number {
        // Count words in last 60 seconds
        const wordsInLastMinute = this.wordTimestamps.filter(t => t > now - 60000).length
        return wordsInLastMinute // Rough estimate, can be smoothed
    }

    private cleanupTimestamps(now: number) {
        const cutoff = now - 60000
        this.wordTimestamps = this.wordTimestamps.filter(t => t > cutoff)
        this.fillerTimestamps = this.fillerTimestamps.filter(t => t > cutoff)
    }

    public reset() {
        this.wordTimestamps = []
        this.fillerTimestamps = []
        this.recentVolumeSamples = []
    }
}
