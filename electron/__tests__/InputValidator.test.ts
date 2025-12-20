import { InputValidator } from '../utils/InputValidator'

describe('InputValidator', () => {
  describe('validateApiKey', () => {
    it('should validate OpenAI API key format', () => {
      expect(InputValidator.validateApiKey('openai', 'sk-1234567890abcdef')).toBe(true)
      expect(InputValidator.validateApiKey('openai', 'sk-')).toBe(false)
      expect(InputValidator.validateApiKey('openai', 'invalid')).toBe(false)
    })

    it('should validate Anthropic API key format', () => {
      expect(InputValidator.validateApiKey('anthropic', 'sk-ant-1234567890abcdef')).toBe(true)
      expect(InputValidator.validateApiKey('anthropic', 'sk-ant-')).toBe(false)
      expect(InputValidator.validateApiKey('anthropic', 'invalid')).toBe(false)
    })
  })

  describe('validateFilePath', () => {
    it('should reject paths with directory traversal', () => {
      expect(InputValidator.validateFilePath('../etc/passwd')).toBe(false)
      expect(InputValidator.validateFilePath('../../secret')).toBe(false)
      expect(InputValidator.validateFilePath('~/secret')).toBe(false)
    })

    it('should accept valid file paths', () => {
      expect(InputValidator.validateFilePath('/valid/path/file.txt')).toBe(true)
      expect(InputValidator.validateFilePath('valid/path/file.txt')).toBe(true)
    })
  })

  describe('validateString', () => {
    it('should validate and trim strings', () => {
      expect(InputValidator.validateString('  test  ')).toBe('test')
      expect(InputValidator.validateString('')).toBe('')
      expect(InputValidator.validateString(null)).toBeNull()
      expect(InputValidator.validateString(123)).toBeNull()
    })

    it('should enforce max length', () => {
      const longString = 'a'.repeat(10001)
      expect(InputValidator.validateString(longString, 10000)).toBeNull()
    })
  })

  describe('validateNumber', () => {
    it('should validate numbers within range', () => {
      expect(InputValidator.validateNumber(5, 0, 10)).toBe(5)
      expect(InputValidator.validateNumber(15, 0, 10)).toBeNull()
      expect(InputValidator.validateNumber(-5, 0, 10)).toBeNull()
      expect(InputValidator.validateNumber('not a number')).toBeNull()
    })
  })
})

