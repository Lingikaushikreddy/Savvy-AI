/**
 * ApiKeyValidator - Validates API keys by making test requests
 */

import axios from 'axios'
import { Logger } from '../logging/Logger'
import { AppError, ErrorType } from '../errors/ErrorHandler'

export interface ApiKeyValidationResult {
  valid: boolean
  error?: string
  provider?: string
}

export class ApiKeyValidator {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Validate OpenAI API key
   */
  async validateOpenAIKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      })

      if (response.status === 200) {
        this.logger.info('ApiKeyValidator', 'OpenAI API key validated successfully')
        return { valid: true, provider: 'openai' }
      }

      return { valid: false, error: 'Invalid response from OpenAI API', provider: 'openai' }
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { valid: false, error: 'Invalid API key', provider: 'openai' }
      }
      if (error.response?.status === 429) {
        return { valid: false, error: 'Rate limit exceeded', provider: 'openai' }
      }
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { valid: false, error: 'Connection timeout', provider: 'openai' }
      }

      this.logger.error('ApiKeyValidator', 'Error validating OpenAI API key', error)
      return { valid: false, error: error.message || 'Unknown error', provider: 'openai' }
    }
  }

  /**
   * Validate Anthropic API key
   */
  async validateAnthropicKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
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

      if (response.status === 200) {
        this.logger.info('ApiKeyValidator', 'Anthropic API key validated successfully')
        return { valid: true, provider: 'anthropic' }
      }

      return { valid: false, error: 'Invalid response from Anthropic API', provider: 'anthropic' }
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { valid: false, error: 'Invalid API key', provider: 'anthropic' }
      }
      if (error.response?.status === 429) {
        return { valid: false, error: 'Rate limit exceeded', provider: 'anthropic' }
      }
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { valid: false, error: 'Connection timeout', provider: 'anthropic' }
      }

      this.logger.error('ApiKeyValidator', 'Error validating Anthropic API key', error)
      return { valid: false, error: error.message || 'Unknown error', provider: 'anthropic' }
    }
  }

  /**
   * Validate API key for a provider
   */
  async validateApiKey(provider: 'openai' | 'anthropic', apiKey: string): Promise<ApiKeyValidationResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key is empty', provider }
    }

    switch (provider) {
      case 'openai':
        return this.validateOpenAIKey(apiKey)
      case 'anthropic':
        return this.validateAnthropicKey(apiKey)
      default:
        return { valid: false, error: 'Unknown provider', provider }
    }
  }
}

