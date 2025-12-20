/**
 * LicenseManager - Handles license validation, subscription management, and feature gating
 */

import { app } from 'electron'
import crypto from 'crypto'
import axios from 'axios'
import { Logger } from '../logging/Logger'
import { DatabaseManager } from '../database/DatabaseManager'
import { KeychainManager } from '../utils/KeychainManager'

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise'
export type LicenseStatus = 'active' | 'expired' | 'trial' | 'invalid' | 'suspended'

export interface LicenseInfo {
  licenseKey: string
  email: string
  tier: SubscriptionTier
  status: LicenseStatus
  expiresAt: number | null // null = lifetime
  trialEndsAt: number | null
  features: string[]
  maxUsers?: number
  maxConversations?: number
  maxStorageGB?: number
}

export interface FeatureLimits {
  maxConversationsPerMonth: number
  maxScreenshotsPerDay: number
  maxAudioMinutesPerMonth: number
  maxAIQueriesPerMonth: number
  advancedPlaybooks: boolean
  crmIntegrations: boolean
  voiceCoaching: boolean
  customShortcuts: boolean
  prioritySupport: boolean
  apiAccess: boolean
}

const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    maxConversationsPerMonth: 10,
    maxScreenshotsPerDay: 50,
    maxAudioMinutesPerMonth: 60,
    maxAIQueriesPerMonth: 100,
    advancedPlaybooks: false,
    crmIntegrations: false,
    voiceCoaching: false,
    customShortcuts: true,
    prioritySupport: false,
    apiAccess: false
  },
  pro: {
    maxConversationsPerMonth: 500,
    maxScreenshotsPerDay: 1000,
    maxAudioMinutesPerMonth: 1000,
    maxAIQueriesPerMonth: 10000,
    advancedPlaybooks: true,
    crmIntegrations: true,
    voiceCoaching: true,
    customShortcuts: true,
    prioritySupport: true,
    apiAccess: false
  },
  team: {
    maxConversationsPerMonth: 5000,
    maxScreenshotsPerDay: 10000,
    maxAudioMinutesPerMonth: 10000,
    maxAIQueriesPerMonth: 100000,
    advancedPlaybooks: true,
    crmIntegrations: true,
    voiceCoaching: true,
    customShortcuts: true,
    prioritySupport: true,
    apiAccess: true
  },
  enterprise: {
    maxConversationsPerMonth: -1, // unlimited
    maxScreenshotsPerDay: -1,
    maxAudioMinutesPerMonth: -1,
    maxAIQueriesPerMonth: -1,
    advancedPlaybooks: true,
    crmIntegrations: true,
    voiceCoaching: true,
    customShortcuts: true,
    prioritySupport: true,
    apiAccess: true
  }
}

export class LicenseManager {
  private logger: Logger
  private db: DatabaseManager
  private keychain: KeychainManager
  private licenseInfo: LicenseInfo | null = null
  private validationEndpoint: string
  private cachedValidation: { timestamp: number; valid: boolean } | null = null
  private readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour

  constructor(logger: Logger, db: DatabaseManager) {
    this.logger = logger
    this.db = db
    this.keychain = KeychainManager.getInstance()
    // In production, use your actual license server
    this.validationEndpoint = process.env.LICENSE_SERVER_URL || 'https://api.savvyai.com/v1/validate'
  }

  /**
   * Initialize license from stored data
   */
  async initialize(): Promise<void> {
    try {
      const licenseKey = await this.db.getSetting('license.key')
      if (licenseKey) {
        await this.validateLicense(licenseKey)
      } else {
        // Start trial if no license
        await this.startTrial()
      }
    } catch (error) {
      this.logger.error('LicenseManager', 'Failed to initialize license', error)
      await this.startTrial()
    }
  }

  /**
   * Activate license with license key
   */
  async activateLicense(licenseKey: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(
        `${this.validationEndpoint}/activate`,
        { licenseKey, email, machineId: this.getMachineId() },
        { timeout: 10000 }
      )

      if (response.data.valid) {
        const licenseInfo: LicenseInfo = {
          licenseKey,
          email,
          tier: response.data.tier,
          status: response.data.status,
          expiresAt: response.data.expiresAt,
          trialEndsAt: null,
          features: response.data.features || [],
          maxUsers: response.data.maxUsers,
          maxConversations: response.data.maxConversations,
          maxStorageGB: response.data.maxStorageGB
        }

        await this.saveLicense(licenseInfo)
        this.licenseInfo = licenseInfo
        this.cachedValidation = { timestamp: Date.now(), valid: true }

        this.logger.info('LicenseManager', 'License activated', { tier: licenseInfo.tier })
        return { success: true, message: 'License activated successfully' }
      } else {
        return { success: false, message: response.data.message || 'Invalid license key' }
      }
    } catch (error: any) {
      this.logger.error('LicenseManager', 'License activation failed', error)
      return { success: false, message: error.message || 'Failed to activate license' }
    }
  }

  /**
   * Validate license (online or offline)
   */
  async validateLicense(licenseKey?: string): Promise<boolean> {
    const key = licenseKey || (await this.db.getSetting('license.key'))
    if (!key) {
      return false
    }

    // Check cache
    if (this.cachedValidation && Date.now() - this.cachedValidation.timestamp < this.CACHE_DURATION) {
      return this.cachedValidation.valid
    }

    try {
      // Try online validation first
      const response = await axios.post(
        `${this.validationEndpoint}/validate`,
        { licenseKey: key, machineId: this.getMachineId() },
        { timeout: 5000 }
      )

      if (response.data.valid) {
        this.cachedValidation = { timestamp: Date.now(), valid: true }
        await this.updateLicenseInfo(response.data)
        return true
      } else {
        this.cachedValidation = { timestamp: Date.now(), valid: false }
        return false
      }
    } catch (error) {
      // Fallback to offline validation
      this.logger.warn('LicenseManager', 'Online validation failed, using offline', error)
      return this.validateOffline(key)
    }
  }

  /**
   * Offline license validation (for when server is unavailable)
   */
  private validateOffline(licenseKey: string): boolean {
    const storedInfo = this.licenseInfo
    if (!storedInfo || storedInfo.licenseKey !== licenseKey) {
      return false
    }

    // Check expiration
    if (storedInfo.expiresAt && storedInfo.expiresAt < Date.now()) {
      return false
    }

    // Check trial expiration
    if (storedInfo.trialEndsAt && storedInfo.trialEndsAt < Date.now()) {
      return false
    }

    return storedInfo.status === 'active' || storedInfo.status === 'trial'
  }

  /**
   * Start free trial
   */
  async startTrial(): Promise<void> {
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
    const licenseInfo: LicenseInfo = {
      licenseKey: `TRIAL-${crypto.randomBytes(8).toString('hex')}`,
      email: '',
      tier: 'free',
      status: 'trial',
      expiresAt: null,
      trialEndsAt,
      features: []
    }

    await this.saveLicense(licenseInfo)
    this.licenseInfo = licenseInfo
    this.logger.info('LicenseManager', 'Trial started', { trialEndsAt })
  }

  /**
   * Get current license info
   */
  getLicenseInfo(): LicenseInfo | null {
    return this.licenseInfo
  }

  /**
   * Get feature limits for current tier
   */
  getFeatureLimits(): FeatureLimits {
    const tier = this.licenseInfo?.tier || 'free'
    return TIER_LIMITS[tier]
  }

  /**
   * Check if feature is available
   */
  hasFeature(feature: keyof FeatureLimits): boolean {
    const limits = this.getFeatureLimits()
    return limits[feature] === true || limits[feature] === -1 || (typeof limits[feature] === 'number' && limits[feature] > 0)
  }

  /**
   * Check if usage is within limits
   */
  async checkUsageLimit(metric: keyof FeatureLimits, currentUsage: number): Promise<boolean> {
    const limits = this.getFeatureLimits()
    const limit = limits[metric]

    if (limit === -1) return true // unlimited
    if (typeof limit === 'boolean') return limit
    if (typeof limit === 'number') return currentUsage < limit

    return false
  }

  /**
   * Get upgrade URL
   */
  getUpgradeUrl(tier?: SubscriptionTier): string {
    const baseUrl = process.env.UPGRADE_URL || 'https://savvyai.com/pricing'
    return tier ? `${baseUrl}?tier=${tier}` : baseUrl
  }

  /**
   * Save license to database
   */
  private async saveLicense(licenseInfo: LicenseInfo): Promise<void> {
    await this.db.setSetting('license.key', licenseInfo.licenseKey)
    await this.db.setSetting('license.email', licenseInfo.email)
    await this.db.setSetting('license.tier', licenseInfo.tier)
    await this.db.setSetting('license.status', licenseInfo.status)
    await this.db.setSetting('license.expiresAt', licenseInfo.expiresAt?.toString() || '')
    await this.db.setSetting('license.trialEndsAt', licenseInfo.trialEndsAt?.toString() || '')
    await this.db.setSetting('license.features', JSON.stringify(licenseInfo.features))
  }

  /**
   * Update license info from server response
   */
  private async updateLicenseInfo(data: any): Promise<void> {
    if (this.licenseInfo) {
      this.licenseInfo.status = data.status
      this.licenseInfo.expiresAt = data.expiresAt
      this.licenseInfo.tier = data.tier
      await this.saveLicense(this.licenseInfo)
    }
  }

  /**
   * Get unique machine ID
   */
  private getMachineId(): string {
    // Use app.getPath('userData') as machine identifier
    // In production, use a more robust method
    return crypto.createHash('sha256').update(app.getPath('userData')).digest('hex').substring(0, 16)
  }
}

