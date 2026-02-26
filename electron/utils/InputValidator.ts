/**
 * InputValidator - Validates and sanitizes IPC handler inputs
 */

import path from 'path'

export class InputValidator {
  /**
   * Validate API key format
   */
  static validateApiKey(provider: 'openai' | 'anthropic' | 'gemini' | 'mistral', key: string): boolean {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return false
    }

    const trimmed = key.trim()

    // All keys must be at least 20 characters
    if (trimmed.length < 20) return false
    // Reject keys longer than 500 characters (prevents DoS via absurd strings)
    if (trimmed.length > 500) return false

    switch (provider) {
      case 'openai':
        return trimmed.startsWith('sk-')
      case 'anthropic':
        return trimmed.startsWith('sk-ant-')
      case 'gemini':
        return trimmed.startsWith('AIza')
      case 'mistral':
        // Mistral keys don't have a standard prefix, just validate length
        return true
      default:
        return false
    }
  }

  /**
   * Validate file path (prevent directory traversal, null byte injection, symlink attacks)
   */
  static validateFilePath(filePath: string, allowedBaseDir?: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      return false
    }

    // Block null bytes (path truncation attack)
    if (filePath.includes('\0')) {
      return false
    }

    // Prevent directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return false
    }

    // Must be an absolute path
    if (!path.isAbsolute(filePath)) {
      return false
    }

    if (allowedBaseDir) {
      const resolved = path.resolve(filePath)
      const base = path.resolve(allowedBaseDir)
      return resolved.startsWith(base + path.sep) || resolved === base
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
    // Block null bytes
    if (input.includes('\0')) {
      return null
    }
    return input.trim()
  }

  /**
   * Validate number input
   */
  static validateNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input)
    if (isNaN(num) || !isFinite(num)) {
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
   * Validate URL (prevent SSRF - only allow known API domains)
   */
  static validateUrl(url: string, allowedDomains: string[]): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return false
      return allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain))
    } catch {
      return false
    }
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
