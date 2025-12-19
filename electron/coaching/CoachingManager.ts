
import { AppState } from '../main'
import { VoiceCoach, CoachingTip } from './VoiceCoach'
import { AudioCaptureManager } from '../audio/AudioCaptureManager'
import { WhisperClient } from '../audio/WhisperClient'
import { BrowserWindow } from 'electron'

export interface CoachingState {
    isActive: boolean
    metrics: any
    tips: CoachingTip[]
    transcript: string
}

export class CoachingManager {
    private appState: AppState
    private voiceCoach: VoiceCoach
    private isRunning: boolean = false
    private transcriptionInterval: NodeJS.Timeout | null = null
    private audioAccumulator: Buffer[] = []
    private lastTranscriptionTime: number = 0
    private readonly TRANSCRIPTION_INTERVAL_MS = 3000 // Transcribe every 3s

    constructor(appState: AppState) {
        this.appState = appState
        this.voiceCoach = new VoiceCoach()
    }

    public startCoaching() {
        if (this.isRunning) return
        this.isRunning = true
        this.voiceCoach.reset()
        this.lastTranscriptionTime = Date.now()

        // Ensure audio capture is running
        this.appState.audioCaptureManager.startCapture()

        // Hook into audio events
        this.appState.audioCaptureManager.on('level', this.handleAudioLevel)
        this.appState.audioCaptureManager.on('data', this.handleAudioData)

        console.log('Coaching Manager started')
        this.broadcastState() // Initial state
    }

    public stopCoaching() {
        if (!this.isRunning) return
        this.isRunning = false

        this.appState.audioCaptureManager.off('level', this.handleAudioLevel)
        this.appState.audioCaptureManager.off('data', this.handleAudioData)

        if (this.transcriptionInterval) {
            clearInterval(this.transcriptionInterval)
            this.transcriptionInterval = null
        }

        console.log('Coaching Manager stopped')
        this.broadcastState()
    }

    private handleAudioLevel = (level: number) => {
        // Send real-time volume to frontend for visual meter
        const win = this.appState.getMainWindow()
        if (win) {
            win.webContents.send('coaching:volume', level)
        }
    }

    private handleAudioData = (chunk: Buffer) => {
        if (!this.isRunning) return

        // 1. Process Audio Metrics (Volume/Pitch)
        // Need int16 array for VoiceCoach
        const int16Data = new Int16Array(
            chunk.buffer,
            chunk.byteOffset,
            chunk.length / 2
        )
        this.voiceCoach.processAudio(int16Data)

        // 2. Accumulate for Transcription
        this.audioAccumulator.push(chunk)

        // Only trigger transcription periodically
        const now = Date.now()
        if (now - this.lastTranscriptionTime > this.TRANSCRIPTION_INTERVAL_MS) {
            this.triggerTranscription()
        }
    }

    private async triggerTranscription() {
        if (this.audioAccumulator.length === 0) return

        const audioBuffer = Buffer.concat(this.audioAccumulator)
        this.audioAccumulator = [] // Clear buffer
        this.lastTranscriptionTime = Date.now()

        try {
            // Check if there's enough audio/volume to justify API call (VAD check)
            // For now, rely on WhisperClient or simple length check
            if (audioBuffer.length < 16000 * 2 * 1) return // Skip if < 1s

            const result = await this.appState.whisperClient.transcribe(audioBuffer)

            if (result.text && result.text.length > 0) {
                // Process text logic
                const metrics = this.voiceCoach.processTranscript(result.text)
                const tips = this.voiceCoach.getFeedback({ ...metrics }) // pass aggregated metrics

                this.broadcastUpdate(result.text, metrics, tips)
            }
        } catch (error) {
            console.error('Coaching transcription failed:', error)
        }
    }

    private broadcastUpdate(transcript: string, metrics: any, tips: CoachingTip[]) {
        const win = this.appState.getMainWindow()
        if (win) {
            win.webContents.send('coaching:update', {
                transcript,
                metrics,
                tips
            })
        }
    }

    private broadcastState() {
        const win = this.appState.getMainWindow()
        if (win) {
            win.webContents.send('coaching:status', { isActive: this.isRunning })
        }
    }
}
