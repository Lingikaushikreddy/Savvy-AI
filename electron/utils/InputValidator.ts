/**
 * InputValidator - Validates and sanitizes IPC handler inputs
 */

export class InputValidator {
  /**
   * Validate API key format
   */
  static validateApiKey(provider: 'openai' | 'anthropic', key: string): boolean {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return false
    }

    const trimmed = key.trim()

    switch (provider) {
      case 'openai':
        return trimmed.startsWith('sk-') && trimmed.length > 20
      case 'anthropic':
        return trimmed.startsWith('sk-ant-') && trimmed.length > 20
      default:
        return false
    }
  }

  /**
   * Validate file path (prevent directory traversal)
   */
  static validateFilePath(filePath: string, allowedBaseDir?: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      return false
    }

    // Prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return false
    }

    if (allowedBaseDir) {
      const resolved = require('path').resolve(filePath)
      const base = require('path').resolve(allowedBaseDir)
      return resolved.startsWith(base)
    }

    return true
  }

  /**
   * Validate conversation ID (UUID format)
   */
  static validateConversationId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  /**
   * Validate string input (prevent injection)
   */
  static validateString(input: any, maxLength: number = 10000): string | null {
    if (typeof input !== 'string') {
      return null
    }
    if (input.length > maxLength) {
      return null
    }
    // Basic sanitization
    return input.trim()
  }

  /**
   * Validate number input
   */
  static validateNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input)
    if (isNaN(num)) {
      return null
    }
    if (min !== undefined && num < min) {
      return null
    }
    if (max !== undefined && num > max) {
      return null
    }
    return num
  }

  /**
   * Validate boolean input
   */
  static validateBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input
    }
    if (typeof input === 'string') {
      return input.toLowerCase() === 'true'
    }
    return false
  }

  /**
   * Sanitize object (remove dangerous properties)
   */
  static sanitizeObject(obj: any, maxDepth: number = 5): any {
    if (maxDepth <= 0) {
      return null
    }

    if (obj === null || obj === undefined) {
      return obj
    }

    if (typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxDepth - 1))
    }

    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      sanitized[key] = this.sanitizeObject(value, maxDepth - 1)
    }

    return sanitized
  }
}

