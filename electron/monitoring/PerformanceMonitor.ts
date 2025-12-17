
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

interface Metric {
    timestamp: number
    type: 'cpu' | 'memory' | 'api_latency' | 'error'
    value: any
    metadata?: any
}

export class PerformanceMonitor {
    private logPath: string
    private metricsBuffer: Metric[] = []
    private flushInterval: NodeJS.Timeout | null = null

    constructor() {
        this.logPath = path.join(app.getPath('userData'), 'performance.log')
        this.startMonitoring()
    }

    private startMonitoring() {
        // Collect system metrics every 30 seconds
        setInterval(() => this.collectSystemMetrics(), 30000)

        // Flush to file every 1 minute
        this.flushInterval = setInterval(() => this.flushMetrics(), 60000)
    }

    private collectSystemMetrics() {
        const mem = process.memoryUsage()
        const cpu = process.cpuUsage() // Returns accumulative usage, need diff for % but raw is fine for logging

        this.recordMetric('memory', {
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            rss: mem.rss,
            external: mem.external
        })

        this.recordMetric('cpu', {
            user: cpu.user,
            system: cpu.system,
            uptime: process.uptime()
        })
    }

    public recordMetric(type: 'cpu' | 'memory' | 'api_latency' | 'error', value: any, metadata?: any) {
        this.metricsBuffer.push({
            timestamp: Date.now(),
            type,
            value,
            metadata
        })
    }

    public recordLatency(operation: string, durationMs: number) {
        this.recordMetric('api_latency', durationMs, { operation })
    }

    public recordError(source: string, error: any) {
        this.recordMetric('error', error.message || String(error), { source, stack: error.stack })
    }

    private async flushMetrics() {
        if (this.metricsBuffer.length === 0) return

        const data = this.metricsBuffer.map(m => JSON.stringify(m)).join('\n') + '\n'
        this.metricsBuffer = []

        try {
            await fs.promises.appendFile(this.logPath, data, 'utf8')
        } catch (e) {
            console.error('Failed to flush performance metrics:', e)
        }
    }

    public getLogPath(): string {
        return this.logPath
    }
}
