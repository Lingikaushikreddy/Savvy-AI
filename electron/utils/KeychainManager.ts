/**
 * KeychainManager - Secure storage using OS keychain
 * Uses OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 */

import { app } from 'electron'
import * as keytar from 'keytar'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const SERVICE_NAME = 'com.electron.savvy-ai'
const ENCRYPTION_KEY_NAME = 'encryption-key'

export class KeychainManager {
  private static instance: KeychainManager | null = null
  private fallbackKeyPath: string

  private constructor() {
    this.fallbackKeyPath = path.join(app.getPath('userData'), 'secret.key')
  }

  public static getInstance(): KeychainManager {
    if (!KeychainManager.instance) {
      KeychainManager.instance = new KeychainManager()
    }
    return KeychainManager.instance
  }

  /**
   * Store encryption key in OS keychain
   */
  async storeEncryptionKey(key: Buffer): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, ENCRYPTION_KEY_NAME, key.toString('hex'))
      // Remove fallback file if it exists
      if (fs.existsSync(this.fallbackKeyPath)) {
        fs.unlinkSync(this.fallbackKeyPath)
      }
    } catch (error) {
      console.warn('Failed to store key in keychain, using fallback:', error)
      // Fallback to file-based storage with restricted permissions
      fs.mkdirSync(path.dirname(this.fallbackKeyPath), { recursive: true })
      fs.writeFileSync(this.fallbackKeyPath, key, { mode: 0o600 })
    }
  }

  /**
   * Retrieve encryption key from OS keychain
   */
  async getEncryptionKey(): Promise<Buffer | null> {
    try {
      const keyHex = await keytar.getPassword(SERVICE_NAME, ENCRYPTION_KEY_NAME)
      if (keyHex) {
        return Buffer.from(keyHex, 'hex')
      }
    } catch (error) {
      // Logger not available in KeychainManager, use console
      console.warn('Failed to retrieve key from keychain, trying fallback:', error)
    }

    // Fallback to file-based storage
    if (fs.existsSync(this.fallbackKeyPath)) {
      try {
        return fs.readFileSync(this.fallbackKeyPath)
      } catch (error) {
        // Logger not available in KeychainManager, use console
        console.error('Failed to read fallback key file:', error)
        return null
      }
    }

    return null
  }

  /**
   * Generate and store a new encryption key
   */
  async generateAndStoreKey(): Promise<Buffer> {
    const key = crypto.randomBytes(32)
    await this.storeEncryptionKey(key)
    return key
  }

  /**
   * Store API key securely
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, `api-key-${provider}`, apiKey)
    } catch (error) {
      // Logger not available in KeychainManager, use console
      console.error(`Failed to store API key for ${provider}:`, error)
      throw error
    }
  }

  /**
   * Retrieve API key
   */
  async getApiKey(provider: string): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, `api-key-${provider}`)
    } catch (error) {
      // Logger not available in KeychainManager, use console
      console.error(`Failed to retrieve API key for ${provider}:`, error)
      return null
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(provider: string): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, `api-key-${provider}`)
    } catch (error) {
      // Logger not available in KeychainManager, use console
      console.error(`Failed to delete API key for ${provider}:`, error)
    }
  }
}

