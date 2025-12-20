/**
 * UsageTracker - Tracks usage against subscription limits
 */

import { Logger } from '../logging/Logger'
import { DatabaseManager } from '../database/DatabaseManager'
import { LicenseManager, FeatureLimits } from './LicenseManager'

export interface UsageStats {
  conversationsThisMonth: number
  screenshotsToday: number
  audioMinutesThisMonth: number
  aiQueriesThisMonth: number
  storageUsedGB: number
}

export class UsageTracker {
  private logger: Logger
  private db: DatabaseManager
  private licenseManager: LicenseManager
  private currentMonth: string
  private currentDay: string

  constructor(logger: Logger, db: DatabaseManager, licenseManager: LicenseManager) {
    this.logger = logger
    this.db = db
    this.licenseManager = licenseManager
    this.currentMonth = this.getCurrentMonth()
    this.currentDay = this.getCurrentDay()
  }

  /**
   * Track conversation creation
   */
  async trackConversation(): Promise<{ allowed: boolean; remaining: number }> {
    const stats = await this.getUsageStats()
    const limits = this.licenseManager.getFeatureLimits()
    
    stats.conversationsThisMonth++
    await this.saveUsageStats(stats)

    const allowed = limits.maxConversationsPerMonth === -1 || 
                    stats.conversationsThisMonth < limits.maxConversationsPerMonth
    const remaining = limits.maxConversationsPerMonth === -1 
      ? -1 
      : Math.max(0, limits.maxConversationsPerMonth - stats.conversationsThisMonth)

    if (!allowed) {
      this.logger.warn('UsageTracker', 'Conversation limit reached', { 
        current: stats.conversationsThisMonth, 
        limit: limits.maxConversationsPerMonth 
      })
    }

    return { allowed, remaining }
  }

  /**
   * Track screenshot capture
   */
  async trackScreenshot(): Promise<{ allowed: boolean; remaining: number }> {
    const stats = await this.getUsageStats()
    const limits = this.licenseManager.getFeatureLimits()

    // Reset daily counter if new day
    const today = this.getCurrentDay()
    if (today !== this.currentDay) {
      stats.screenshotsToday = 0
      this.currentDay = today
    }

    stats.screenshotsToday++
    await this.saveUsageStats(stats)

    const allowed = limits.maxScreenshotsPerDay === -1 || 
                    stats.screenshotsToday < limits.maxScreenshotsPerDay
    const remaining = limits.maxScreenshotsPerDay === -1 
      ? -1 
      : Math.max(0, limits.maxScreenshotsPerDay - stats.screenshotsToday)

    if (!allowed) {
      this.logger.warn('UsageTracker', 'Screenshot limit reached', { 
        current: stats.screenshotsToday, 
        limit: limits.maxScreenshotsPerDay 
      })
    }

    return { allowed, remaining }
  }

  /**
   * Track audio minutes
   */
  async trackAudioMinutes(minutes: number): Promise<{ allowed: boolean; remaining: number }> {
    const stats = await this.getUsageStats()
    const limits = this.licenseManager.getFeatureLimits()

    // Reset monthly counter if new month
    const month = this.getCurrentMonth()
    if (month !== this.currentMonth) {
      stats.audioMinutesThisMonth = 0
      this.currentMonth = month
    }

    stats.audioMinutesThisMonth += minutes
    await this.saveUsageStats(stats)

    const allowed = limits.maxAudioMinutesPerMonth === -1 || 
                    stats.audioMinutesThisMonth < limits.maxAudioMinutesPerMonth
    const remaining = limits.maxAudioMinutesPerMonth === -1 
      ? -1 
      : Math.max(0, limits.maxAudioMinutesPerMonth - stats.audioMinutesThisMonth)

    if (!allowed) {
      this.logger.warn('UsageTracker', 'Audio minutes limit reached', { 
        current: stats.audioMinutesThisMonth, 
        limit: limits.maxAudioMinutesPerMonth 
      })
    }

    return { allowed, remaining }
  }

  /**
   * Track AI query
   */
  async trackAIQuery(): Promise<{ allowed: boolean; remaining: number }> {
    const stats = await this.getUsageStats()
    const limits = this.licenseManager.getFeatureLimits()

    // Reset monthly counter if new month
    const month = this.getCurrentMonth()
    if (month !== this.currentMonth) {
      stats.aiQueriesThisMonth = 0
      this.currentMonth = month
    }

    stats.aiQueriesThisMonth++
    await this.saveUsageStats(stats)

    const allowed = limits.maxAIQueriesPerMonth === -1 || 
                    stats.aiQueriesThisMonth < limits.maxAIQueriesPerMonth
    const remaining = limits.maxAIQueriesPerMonth === -1 
      ? -1 
      : Math.max(0, limits.maxAIQueriesPerMonth - stats.aiQueriesThisMonth)

    if (!allowed) {
      this.logger.warn('UsageTracker', 'AI query limit reached', { 
        current: stats.aiQueriesThisMonth, 
        limit: limits.maxAIQueriesPerMonth 
      })
    }

    return { allowed, remaining }
  }

  /**
   * Get current usage stats
   */
  async getUsageStats(): Promise<UsageStats> {
    const month = this.getCurrentMonth()
    const day = this.getCurrentDay()

    // Reset if new period
    if (month !== this.currentMonth) {
      this.currentMonth = month
      // Reset monthly counters
      await this.db.setSetting('usage.conversationsThisMonth', '0')
      await this.db.setSetting('usage.audioMinutesThisMonth', '0')
      await this.db.setSetting('usage.aiQueriesThisMonth', '0')
    }

    if (day !== this.currentDay) {
      this.currentDay = day
      await this.db.setSetting('usage.screenshotsToday', '0')
    }

    const conversations = parseInt(await this.db.getSetting('usage.conversationsThisMonth') || '0')
    const screenshots = parseInt(await this.db.getSetting('usage.screenshotsToday') || '0')
    const audioMinutes = parseFloat(await this.db.getSetting('usage.audioMinutesThisMonth') || '0')
    const aiQueries = parseInt(await this.db.getSetting('usage.aiQueriesThisMonth') || '0')
    const storage = parseFloat(await this.db.getSetting('usage.storageUsedGB') || '0')

    return {
      conversationsThisMonth: conversations,
      screenshotsToday: screenshots,
      audioMinutesThisMonth: audioMinutes,
      aiQueriesThisMonth: aiQueries,
      storageUsedGB: storage
    }
  }

  /**
   * Save usage stats
   */
  private async saveUsageStats(stats: UsageStats): Promise<void> {
    await this.db.setSetting('usage.conversationsThisMonth', stats.conversationsThisMonth.toString())
    await this.db.setSetting('usage.screenshotsToday', stats.screenshotsToday.toString())
    await this.db.setSetting('usage.audioMinutesThisMonth', stats.audioMinutesThisMonth.toString())
    await this.db.setSetting('usage.aiQueriesThisMonth', stats.aiQueriesThisMonth.toString())
    await this.db.setSetting('usage.storageUsedGB', stats.storageUsedGB.toString())
  }

  /**
   * Get current month string (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  /**
   * Get current day string (YYYY-MM-DD)
   */
  private getCurrentDay(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
}

