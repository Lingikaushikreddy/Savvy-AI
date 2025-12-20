/**
 * ConfigValidator - Validates configuration on startup
 */

import { app } from 'electron'
import { Logger } from '../logging/Logger'

export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class ConfigValidator {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Validate all configuration
   */
  async validateConfig(): Promise<ConfigValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion < 18) {
      errors.push(`Node.js version ${nodeVersion} is not supported. Minimum version is 18.x`)
    }

    // Check Electron version
    const electronVersion = process.versions.electron
    if (!electronVersion) {
      errors.push('Electron version not detected')
    }

    // Check required directories
    const userDataPath = app.getPath('userData')
    try {
      const fs = require('fs')
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }
    } catch (error) {
      errors.push(`Cannot access user data directory: ${error}`)
    }

    // Check environment variables (warnings only, not errors)
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      warnings.push('No API keys found in environment variables. Users will need to configure them in settings.')
    }

    // Validate API keys if present
    if (process.env.OPENAI_API_KEY) {
      if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        errors.push('Invalid OpenAI API key format in environment')
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
        errors.push('Invalid Anthropic API key format in environment')
      }
    }

    // Check disk space (warning if low)
    try {
      const diskSpace = await this.checkDiskSpace()
      if (diskSpace < 100 * 1024 * 1024) { // Less than 100MB
        warnings.push('Low disk space detected. Some features may not work properly.')
      }
    } catch (error) {
      warnings.push('Could not check disk space')
    }

    const valid = errors.length === 0

    if (!valid) {
      this.logger.error('ConfigValidator', 'Configuration validation failed', { errors })
    }

    if (warnings.length > 0) {
      this.logger.warn('ConfigValidator', 'Configuration warnings', { warnings })
    }

    return {
      valid,
      errors,
      warnings
    }
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const fs = require('fs')
        const stats = fs.statSync(app.getPath('userData'))
        // This is a simplified check - in production, use a proper disk space library
        resolve(1024 * 1024 * 1024) // Assume 1GB for now
      } catch (error) {
        reject(error)
      }
    })
  }
}

