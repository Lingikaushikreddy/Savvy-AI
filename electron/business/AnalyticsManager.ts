/**
 * AnalyticsManager - Tracks user behavior, feature usage, and business metrics
 */

import { Logger } from '../logging/Logger'
import { DatabaseManager } from '../database/DatabaseManager'
import { LicenseManager } from './LicenseManager'

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
}

export interface FeatureUsage {
  feature: string
  count: number
  lastUsed: number
  totalTime?: number
}

export interface BusinessMetrics {
  dailyActiveUsers: number
  monthlyActiveUsers: number
  conversionRate: number
  trialToPaidRate: number
  averageSessionDuration: number
  featureAdoption: Record<string, number>
  revenue: {
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
    churn: number
  }
}

export class AnalyticsManager {
  private logger: Logger
  private db: DatabaseManager
  private licenseManager: LicenseManager
  private sessionId: string
  private analyticsEndpoint: string
  private enabled: boolean
  private eventQueue: AnalyticsEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor(logger: Logger, db: DatabaseManager, licenseManager: LicenseManager) {
    this.logger = logger
    this.db = db
    this.licenseManager = licenseManager
    this.sessionId = this.generateSessionId()
    this.analyticsEndpoint = process.env.ANALYTICS_ENDPOINT || 'https://analytics.savvyai.com/v1/events'
    this.enabled = process.env.DISABLE_ANALYTICS !== 'true'

    if (this.enabled) {
      this.startFlushInterval()
    }
  }

  /**
   * Track an event
   */
  async track(event: string, properties?: Record<string, any>): Promise<void> {
    if (!this.enabled) return

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        appVersion: require('../../package.json').version,
        platform: process.platform,
        tier: this.licenseManager.getLicenseInfo()?.tier || 'free'
      },
      timestamp: Date.now(),
      sessionId: this.sessionId
    }

    this.eventQueue.push(analyticsEvent)
    await this.saveEventLocally(analyticsEvent)

    // Flush if queue is large
    if (this.eventQueue.length >= 50) {
      await this.flush()
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(feature: string, duration?: number): Promise<void> {
    await this.track('feature_used', {
      feature,
      duration,
      hasAccess: this.licenseManager.hasFeature(feature as any)
    })

    // Update local usage stats
    await this.updateFeatureUsage(feature, duration)
  }

  /**
   * Track conversion event (trial to paid, upgrade, etc.)
   */
  async trackConversion(type: 'trial_to_paid' | 'upgrade' | 'downgrade', tier: string, revenue?: number): Promise<void> {
    await this.track('conversion', {
      type,
      tier,
      revenue,
      timestamp: Date.now()
    })
  }

  /**
   * Track error
   */
  async trackError(error: Error, context?: Record<string, any>): Promise<void> {
    await this.track('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      ...context
    })
  }

  /**
   * Track user action (for funnel analysis)
   */
  async trackUserAction(action: string, step?: string): Promise<void> {
    await this.track('user_action', {
      action,
      step,
      timestamp: Date.now()
    })
  }

  /**
   * Get feature usage statistics
   */
  async getFeatureUsage(feature?: string): Promise<FeatureUsage | FeatureUsage[]> {
    // Implementation to retrieve from database
    // This would query the analytics events table
    return []
  }

  /**
   * Get business metrics
   */
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    // Calculate metrics from stored events
    // This would aggregate data from the analytics database
    return {
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      conversionRate: 0,
      trialToPaidRate: 0,
      averageSessionDuration: 0,
      featureAdoption: {},
      revenue: {
        mrr: 0,
        arr: 0,
        churn: 0
      }
    }
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      // In production, send to analytics server
      // For now, just log
      this.logger.debug('AnalyticsManager', `Flushing ${events.length} events`)
      
      // Mark events as sent in database
      for (const event of events) {
        await this.markEventSent(event)
      }
    } catch (error) {
      this.logger.error('AnalyticsManager', 'Failed to flush events', error)
      // Re-queue events
      this.eventQueue.unshift(...events)
    }
  }

  /**
   * Save event locally
   */
  private async saveEventLocally(event: AnalyticsEvent): Promise<void> {
    // Save to database for offline tracking
    const eventData = JSON.stringify(event)
    await this.db.setSetting(`analytics.event.${Date.now()}`, eventData)
  }

  /**
   * Mark event as sent
   */
  private async markEventSent(event: AnalyticsEvent): Promise<void> {
    // Implementation to mark event as sent in database
  }

  /**
   * Update feature usage stats
   */
  private async updateFeatureUsage(feature: string, duration?: number): Promise<void> {
    const usageKey = `analytics.feature.${feature}`
    const current = await this.db.getSetting(usageKey)
    const usage: FeatureUsage = current ? JSON.parse(current) : {
      feature,
      count: 0,
      lastUsed: Date.now(),
      totalTime: 0
    }

    usage.count++
    usage.lastUsed = Date.now()
    if (duration) {
      usage.totalTime = (usage.totalTime || 0) + duration
    }

    await this.db.setSetting(usageKey, JSON.stringify(usage))
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5 * 60 * 1000) // Flush every 5 minutes
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush() // Final flush
  }
}

