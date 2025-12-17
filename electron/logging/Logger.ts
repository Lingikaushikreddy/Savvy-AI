
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
    timestamp: string
    level: LogLevel
    module: string
    message: string
    metadata?: any
}

export class Logger {
    private logDir: string
    private currentLogFile: string
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    private readonly MAX_FILES = 5
    public debugMode: boolean = false

    constructor(moduleName: string = 'app') {
        // ~/Library/Logs/AntiGravity or AppData/AntiGravity/logs
        // electron app.getPath('logs') usually maps to standard OS log locations
        this.logDir = path.join(app.getPath('userData'), 'logs')
        this.currentLogFile = path.join(this.logDir, `${moduleName}.log`)

        this.ensureLogDir()
    }

    private ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true })
        }
    }

    private rotateLogsIfNeeded() {
        if (!fs.existsSync(this.currentLogFile)) return

        const stats = fs.statSync(this.currentLogFile)
        if (stats.size >= this.MAX_FILE_SIZE) {
            this.rotate()
        }
    }

    private rotate() {
        // Remove oldest (log.5)
        const lastFile = `${this.currentLogFile}.${this.MAX_FILES}`
        if (fs.existsSync(lastFile)) fs.unlinkSync(lastFile)

        // Shift others: log.4 -> log.5, log.3 -> log.4 ...
        for (let i = this.MAX_FILES - 1; i >= 1; i--) {
            const src = `${this.currentLogFile}.${i}`
            const dest = `${this.currentLogFile}.${i + 1}`
            if (fs.existsSync(src)) fs.renameSync(src, dest)
        }

        // Rename current -> log.1
        const firstBackup = `${this.currentLogFile}.1`
        if (fs.existsSync(this.currentLogFile)) fs.renameSync(this.currentLogFile, firstBackup)
    }

    private write(level: LogLevel, module: string, message: string, metadata?: any) {
        if (level === 'debug' && !this.debugMode) return

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            metadata
        }

        const line = JSON.stringify(entry) + '\n'

        try {
            this.rotateLogsIfNeeded()
            fs.appendFileSync(this.currentLogFile, line, 'utf8')

            // Allow console log for dev
            if (process.env.NODE_ENV === 'development' || this.debugMode) {
                console.log(`[${level.toUpperCase()}] [${module}] ${message}`, metadata || '')
            }
        } catch (e) {
            console.error('Failed to write to log:', e)
        }
    }

    public debug(module: string, message: string, metadata?: any) {
        this.write('debug', module, message, metadata)
    }

    public info(module: string, message: string, metadata?: any) {
        this.write('info', module, message, metadata)
    }

    public warn(module: string, message: string, metadata?: any) {
        this.write('warn', module, message, metadata)
    }

    public error(module: string, message: string, error?: any) {
        this.write('error', module, message, {
            error: error?.message || error,
            stack: error?.stack
        })
    }

    public setDebugMode(enabled: boolean) {
        this.debugMode = enabled
    }
}
