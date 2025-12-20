/**
 * RateLimiter - Prevents API abuse and manages request throttling
 */

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get or create request history for this identifier
    let requestHistory = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    requestHistory = requestHistory.filter(timestamp => timestamp > windowStart)
    
    // Check if limit exceeded
    if (requestHistory.length >= this.config.maxRequests) {
      return false
    }

    // Add current request
    requestHistory.push(now)
    this.requests.set(identifier, requestHistory)

    return true
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getTimeUntilNextAllowed(identifier: string): number {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    const requestHistory = this.requests.get(identifier) || []
    const recentRequests = requestHistory.filter(timestamp => timestamp > windowStart)

    if (recentRequests.length < this.config.maxRequests) {
      return 0
    }

    // Find oldest request in window
    const oldestRequest = Math.min(...recentRequests)
    const nextAllowed = oldestRequest + this.config.windowMs
    return Math.max(0, nextAllowed - now)
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear()
  }
}

