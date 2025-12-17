
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
// import * as Sentry from '@sentry/electron'; // TODO: Install @sentry/electron

// 1. Comprehensive Error Taxonomy
export enum ErrorType {
    // Permission errors
    SCREEN_PERMISSION_DENIED = 'SCREEN_PERMISSION_DENIED',
    AUDIO_PERMISSION_DENIED = 'AUDIO_PERMISSION_DENIED',

    // API errors
    API_KEY_INVALID = 'API_KEY_INVALID',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    API_TIMEOUT = 'API_TIMEOUT',
    API_SERVER_ERROR = 'API_SERVER_ERROR',
    API_NETWORK_ERROR = 'API_NETWORK_ERROR',

    // Processing errors
    OCR_FAILED = 'OCR_FAILED',
    TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
    LLM_GENERATION_FAILED = 'LLM_GENERATION_FAILED',

    // Database errors
    DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
    DB_QUERY_ERROR = 'DB_QUERY_ERROR',
    DB_CORRUPTION_ERROR = 'DB_CORRUPTION_ERROR',

    // System errors
    OUT_OF_MEMORY = 'OUT_OF_MEMORY',
    DISK_FULL = 'DISK_FULL',
    SYSTEM_RESOURCE_ERROR = 'SYSTEM_RESOURCE_ERROR',

    // Unknown
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ErrorContext {
    operation: string
    component: string
    userId?: string
    conversationId?: string
    additionalInfo?: any
}

export interface ErrorConfig {
    message: string
    type: ErrorType
    severity: ErrorSeverity
    recoverable: boolean
    userMessage: string
    technicalDetails?: any
    context: ErrorContext
    retryable?: boolean
}

// 2. AppError Class
export class AppError extends Error {
    type: ErrorType
    severity: ErrorSeverity
    recoverable: boolean
    userMessage: string
    technicalDetails: any
    timestamp: number
    context: ErrorContext
    retryable: boolean

    constructor(config: ErrorConfig) {
        super(config.message)
        this.type = config.type
        this.severity = config.severity
        this.recoverable = config.recoverable
        this.userMessage = config.userMessage
        this.technicalDetails = config.technicalDetails
        this.timestamp = Date.now()
        this.context = config.context
        this.retryable = config.retryable ?? false
    }

    toJSON() {
        return {
            type: this.type,
            message: this.message,
            userMessage: this.userMessage,
            severity: this.severity,
            recoverable: this.recoverable,
            timestamp: this.timestamp,
            technicalDetails: this.technicalDetails
        }
    }
}

export type RecoveryAction =
    | 'RETRY'
    | 'FALLBACK'
    | 'SKIP'
    | 'USER_ACTION_REQUIRED'
    | 'RESTART_REQUIRED'

export interface ErrorResolution {
    recovered: boolean
    action: RecoveryAction
    message: string
    retryAfter?: number
}

// 6. Retry Mechanism
export class RetryManager {
    private attempts: Map<string, number> = new Map()
    private maxAttempts = 5
    private baseDelay = 1000 // 1 second

    shouldRetry(operationId: string): boolean {
        const attempts = this.attempts.get(operationId) || 0
        return attempts < this.maxAttempts
    }

    getRetryDelay(operationId: string): number {
        const attempts = this.attempts.get(operationId) || 0
        return this.baseDelay * Math.pow(2, attempts)
    }

    async retry<T>(
        operationId: string,
        operation: () => Promise<T>
    ): Promise<T> {
        while (this.shouldRetry(operationId)) {
            try {
                const result = await operation()
                this.attempts.delete(operationId) // Reset on success
                return result
            } catch (error) {
                const attempts = (this.attempts.get(operationId) || 0) + 1
                this.attempts.set(operationId, attempts)

                if (!this.shouldRetry(operationId)) {
                    throw error // Max retries reached
                }

                const delay = this.getRetryDelay(operationId)
                await this.sleep(delay)
            }
        }

        throw new Error(`Max retries reached for ${operationId}`)
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// 7. Graceful Degradation
export class GracefulDegradation {
    async handleScreenCaptureFailure(): Promise<void> {
        console.warn('Screen capture failed. Continuing with audio only.')
        // Logic to notify system
    }

    async handleWhisperFailure(): Promise<string> {
        console.warn('Whisper API failed. Falling back to local STT.')
        return "Local STT Placeholder"
    }

    async handleAllLLMsFailure(query: string): Promise<string> {
        throw new AppError({
            type: ErrorType.LLM_GENERATION_FAILED,
            severity: 'HIGH',
            recoverable: false,
            userMessage: 'Unable to generate response. Please try again.',
            message: 'All LLM providers failed',
            technicalDetails: { query },
            context: { operation: 'llm_query', component: 'LLMRouter' }
        })
    }
}

// 5. User-friendly Messages
const ERROR_MESSAGES: Record<ErrorType, { title: string, message: string, action: string | null, learnMore: string | null }> = {
    [ErrorType.SCREEN_PERMISSION_DENIED]: {
        title: 'Screen Recording Permission Needed',
        message: 'Anti-Gravity needs permission to record your screen.',
        action: 'Open System Preferences',
        learnMore: 'https://docs.antigravity.ai/permissions/screen'
    },
    [ErrorType.AUDIO_PERMISSION_DENIED]: {
        title: 'Microphone Permission Needed',
        message: 'Savvy AI needs microphone access.',
        action: 'Check Permissions',
        learnMore: null,
    },
    [ErrorType.API_KEY_INVALID]: {
        title: 'Invalid API Key',
        message: 'Your OpenAI API key appears to be invalid.',
        action: 'Update API Key',
        learnMore: 'https://docs.antigravity.ai/setup/api-keys'
    },
    [ErrorType.API_RATE_LIMIT]: {
        title: 'Rate Limit Reached',
        message: 'You\'ve reached the API rate limit. Your request will be automatically retried.',
        action: null,
        learnMore: null
    },
    [ErrorType.OCR_FAILED]: {
        title: 'Screen Reading Failed',
        message: 'Unable to read your screen. Try a different window.',
        action: 'Skip Frame',
        learnMore: null
    },
    // Defaults for others
    [ErrorType.API_TIMEOUT]: { title: 'Network Timeout', message: 'Request timed out.', action: 'Retry', learnMore: null },
    [ErrorType.API_SERVER_ERROR]: { title: 'Server Error', message: 'API Provider error.', action: 'Retry', learnMore: null },
    [ErrorType.API_NETWORK_ERROR]: { title: 'Network Error', message: 'Check your connection.', action: 'Retry', learnMore: null },
    [ErrorType.TRANSCRIPTION_FAILED]: { title: 'Transcription Failed', message: 'Audio could not be processed.', action: null, learnMore: null },
    [ErrorType.LLM_GENERATION_FAILED]: { title: 'AI Error', message: 'AI failed to respond.', action: 'Retry', learnMore: null },
    [ErrorType.DB_CONNECTION_ERROR]: { title: 'Database Error', message: 'Connection failed.', action: 'Restart', learnMore: null },
    [ErrorType.DB_QUERY_ERROR]: { title: 'Database Error', message: 'Query failed.', action: null, learnMore: null },
    [ErrorType.DB_CORRUPTION_ERROR]: { title: 'Database Corrupt', message: 'Data corruption detected.', action: 'Reset', learnMore: null },
    [ErrorType.OUT_OF_MEMORY]: { title: 'Out of Memory', message: 'Freeing up resources.', action: null, learnMore: null },
    [ErrorType.DISK_FULL]: { title: 'Disk Full', message: 'Free up space.', action: null, learnMore: null },
    [ErrorType.SYSTEM_RESOURCE_ERROR]: { title: 'System Error', message: 'Resource exhaustion.', action: null, learnMore: null },
    [ErrorType.UNKNOWN_ERROR]: { title: 'Error', message: 'An unknown error occurred.', action: null, learnMore: null },
}

// 8. Health Monitoring
export class HealthMonitor {
    private healthChecks: Array<{ name: string, check: () => Promise<boolean> }> = []

    addCheck(name: string, check: () => Promise<boolean>) {
        this.healthChecks.push({ name, check })
    }

    async runHealthChecks() {
        const results = await Promise.all(
            this.healthChecks.map(async (check) => {
                try {
                    const healthy = await check.check()
                    return { name: check.name, healthy, error: null }
                } catch (error) {
                    return { name: check.name, healthy: false, error }
                }
            })
        )
        return {
            overall: results.every(r => r.healthy),
            checks: results,
            timestamp: Date.now()
        }
    }
}

// 9. Crash Recovery
export class CrashRecovery {
    private stateFile = path.join(app.getPath('userData'), 'recovery.json')

    saveRecoveryState(state: any): void {
        try {
            fs.writeFileSync(this.stateFile, JSON.stringify(state))
        } catch (error) {
            console.error('Failed to save recovery state:', error)
        }
    }

    async restoreState(): Promise<any | null> {
        try {
            if (fs.existsSync(this.stateFile)) {
                const data = fs.readFileSync(this.stateFile, 'utf-8')
                return JSON.parse(data)
            }
        } catch (error) {
            console.error('Failed to restore state:', error)
        }
        return null
    }
}

// 10. Error Reporter (Sentry Stub)
export class ErrorReporter {
    private enabled: boolean = false

    initialize(): void {
        const dsn = process.env.SENTRY_DSN
        if (dsn) {
            // Sentry.init({ dsn, ... })
            // this.enabled = true
        }
    }

    reportError(error: AppError): void {
        if (!this.enabled) return
        // Sentry.captureException(...)
    }
}

// 3. ErrorHandler Class (Main)
import { Logger } from '../logging/Logger'

// ... (existing imports)

// ...

// 3. ErrorHandler Class (Main)
export class ErrorHandler {
    private errorLog: AppError[] = []
    private maxLogSize = 1000
    private retryManager = new RetryManager()
    private gracefulDegradation = new GracefulDegradation()
    private errorReporter = new ErrorReporter()
    private logger: Logger

    constructor(logger?: Logger) {
        this.logger = logger || new Logger('error-handler')
        this.errorReporter.initialize()
    }

    handle(error: AppError): ErrorResolution {
        this.logError(error)
        const resolution = this.attemptRecovery(error)

        if (this.shouldNotifyUser(error)) {
            // Logic to notify user via IPC
        }

        this.errorReporter.reportError(error)

        return resolution
    }

    private logError(error: AppError) {
        this.errorLog.push(error)
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift()
        }

        // Use structured logger
        this.logger.error('ErrorHandler', error.message, {
            type: error.type,
            severity: error.severity,
            context: error.context,
            technicalDetails: error.technicalDetails,
            stack: error.stack
        })
    }

    private shouldNotifyUser(error: AppError): boolean {
        return error.severity === 'HIGH' || error.severity === 'CRITICAL'
    }

    private attemptRecovery(error: AppError): ErrorResolution {
        switch (error.type) {
            case ErrorType.API_RATE_LIMIT:
                return { recovered: true, action: 'RETRY', message: 'Rate limited. Queued for retry.' }
            case ErrorType.API_NETWORK_ERROR:
                return { recovered: false, action: 'RETRY', message: 'Network error. Will retry.' }
            case ErrorType.OUT_OF_MEMORY:
                if (global.gc) global.gc()
                return { recovered: true, action: 'RETRY', message: 'Memory cleared.' }
            case ErrorType.DB_CONNECTION_ERROR:
                return { recovered: false, action: 'RESTART_REQUIRED', message: 'Database connection failed.' }
            default:
                return { recovered: false, action: 'SKIP', message: 'Unknown error.' }
        }
    }

    public getFriendlyMessage(type: ErrorType) {
        return ERROR_MESSAGES[type]
    }
}
