/**
 * ApiKeyValidator - Validates API keys by making test requests
 */

import axios from 'axios'
import { Logger } from '../logging/Logger'

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  provider?: string
}

const ALLOWED_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  mistral: 'https://api.mistral.ai/v1/models',
}

export class ApiKeyValidator {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  private handleError(error: any, provider: string): ApiKeyValidationResult {
    if (error.response?.status === 401) {
      return { valid: false, error: 'Invalid API key', provider }
    }
    if (error.response?.status === 429) {
      return { valid: false, error: 'Rate limit exceeded', provider }
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { valid: false, error: 'Connection timeout', provider }
    }
    // Never log the actual API key in error messages
    this.logger.error('ApiKeyValidator', `Error validating ${provider} API key (status: ${error.response?.status || 'unknown'})`)
    return { valid: false, error: 'Validation failed', provider }
  }

  async validateOpenAIKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.get(ALLOWED_ENDPOINTS.openai, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000
      })
      if (response.status === 200) return { valid: true, provider: 'openai' }
      return { valid: false, error: 'Invalid response', provider: 'openai' }
    } catch (error: any) {
      return this.handleError(error, 'openai')
    }
  }

  async validateAnthropicKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.post(
        ALLOWED_ENDPOINTS.anthropic,
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )
      if (response.status === 200) return { valid: true, provider: 'anthropic' }
      return { valid: false, error: 'Invalid response', provider: 'anthropic' }
    } catch (error: any) {
      return this.handleError(error, 'anthropic')
    }
  }

  async validateGeminiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.get(
        `${ALLOWED_ENDPOINTS.gemini}?key=${apiKey}`,
        { timeout: 10000 }
      )
      if (response.status === 200) return { valid: true, provider: 'gemini' }
      return { valid: false, error: 'Invalid response', provider: 'gemini' }
    } catch (error: any) {
      return this.handleError(error, 'gemini')
    }
  }

  async validateMistralKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.get(ALLOWED_ENDPOINTS.mistral, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000
      })
      if (response.status === 200) return { valid: true, provider: 'mistral' }
      return { valid: false, error: 'Invalid response', provider: 'mistral' }
    } catch (error: any) {
      return this.handleError(error, 'mistral')
    }
  }

  async validateApiKey(provider: 'openai' | 'anthropic' | 'gemini' | 'mistral', apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is empty', provider }
    }

    switch (provider) {
      case 'openai':
        return this.validateOpenAIKey(apiKey)
      case 'anthropic':
        return this.validateAnthropicKey(apiKey)
      case 'gemini':
        return this.validateGeminiKey(apiKey)
      case 'mistral':
        return this.validateMistralKey(apiKey)
      default:
        return { valid: false, error: 'Unknown provider', provider }
    }
  }
}
