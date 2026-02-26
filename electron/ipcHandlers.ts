// ipcHandlers.ts

import { ipcMain, app } from 'electron'
import { AppState } from './main'
import { InputValidator } from './utils/InputValidator'
import { AppError, ErrorType } from './errors/ErrorHandler'
import { Logger } from './logging/Logger'

export function initializeIpcHandlers(appState: AppState): void {
  const logger = appState.logger
  const errorHandler = (error: any, handlerName: string) => {
    logger.error('IPC', `Error in ${handlerName}`, error)
    if (error instanceof AppError) {
      return { success: false, error: error.userMessage, type: error.type }
    }
    return { success: false, error: error.message || 'Unknown error occurred' }
  }

  // --- Window Handlers ---
  ipcMain.handle('window:show', async () => {
    try {
      appState.showMainWindow()
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'window:show')
    }
  })
  
  ipcMain.handle('window:hide', async () => {
    try {
      appState.hideMainWindow()
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'window:hide')
    }
  })
  
  ipcMain.handle('window:toggle', async () => {
    try {
      appState.toggleMainWindow()
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'window:toggle')
    }
  })
  ipcMain.handle('window:move', async (_, x: number, y: number) => {
    // Implement direct move if needed, or mapping to existing move methods
    // For now, these are specific directional moves in AppState, 
    // we might need a generic setPosition in WindowHelper
    // appState.getMainWindow()?.setPosition(x, y) 
    // Keeping existing behavior for directional moves if requested
  })
  ipcMain.handle('window:resize', async (_, width: number, height: number) => {
    try {
      const validWidth = InputValidator.validateNumber(width, 100, 10000)
      const validHeight = InputValidator.validateNumber(height, 100, 10000)
      
      if (!validWidth || !validHeight) {
        throw new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: 'LOW',
          recoverable: true,
          userMessage: 'Invalid window dimensions',
          message: 'Invalid window dimensions provided',
          context: { operation: 'window:resize', component: 'IPC' }
        })
      }
      
      appState.setWindowDimensions(validWidth, validHeight)
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'window:resize')
    }
  })

  // --- Capture Handlers ---
  ipcMain.handle('capture:start', async () => {
    // Default interval 2s
    appState.screenCaptureManager.startCapture(2000)
    appState.audioCaptureManager.startCapture()
  })
  ipcMain.handle('capture:stop', async () => {
    appState.screenCaptureManager.stopCapture()
    appState.audioCaptureManager.stopCapture()
  })
  ipcMain.handle('capture:status', async () => {
    return {
      screen: appState.screenCaptureManager.isCapturing,
      audio: appState.audioCaptureManager.isCapturing
    }
  })
  ipcMain.handle('capture:request-permissions', async () => {
    // Electron specific permission handling if needed
    return true
  })

  // --- AI Handlers ---
  ipcMain.handle('ai:query', async (_, question: string) => {
    try {
      const sanitizedQuestion = InputValidator.validateString(question, 50000)
      if (!sanitizedQuestion) {
        return { success: false, error: 'Invalid question input' }
      }
      const context = await appState.contextBuilder.buildContext()
      const model = await appState.databaseManager.getSetting('ai.model')
      return appState.processingHelper.llmHelper.llmRouter.complete(context, {
        model: model || undefined
      })
    } catch (error) {
      return errorHandler(error, 'ai:query')
    }
  })

  ipcMain.on('ai:stream', async (event, question: string) => {
    try {
      const sanitizedQuestion = InputValidator.validateString(question, 50000)
      if (!sanitizedQuestion) {
        event.reply('ai:stream-end')
        return
      }
      const context = await appState.contextBuilder.buildContext()
      const model = await appState.databaseManager.getSetting('ai.model')
      const stream = appState.processingHelper.llmHelper.llmRouter.stream(context, {
        model: model || undefined
      })

      for await (const chunk of stream) {
        if (event.sender.isDestroyed()) break
        event.reply('ai:stream-chunk', chunk)
      }
      if (!event.sender.isDestroyed()) {
        event.reply('ai:stream-end')
      }
    } catch (error) {
      logger.error('IPC', 'Error in ai:stream', error)
      if (!event.sender.isDestroyed()) {
        event.reply('ai:stream-end')
      }
    }
  })

  ipcMain.handle('ai:stop', async () => {
    // Implement stop generation logic if supported by router
  })

  ipcMain.handle('ai:clear-context', async () => {
    // Clear context builder cache or appState queues
    appState.clearQueues()
  })

  ipcMain.handle('context:analyze', async (_, transcript: string, screenText: string) => {
    try {
      const sanitizedTranscript = InputValidator.validateString(transcript, 100000) || ''
      const sanitizedScreenText = InputValidator.validateString(screenText, 100000) || ''
      return appState.contextAnalyzer.analyzeContext(sanitizedTranscript, sanitizedScreenText)
    } catch (error) {
      return errorHandler(error, 'context:analyze')
    }
  })

  // --- Conversation Handlers ---
  ipcMain.handle('conversation:create', async (_, data) => {
    try {
      const sanitized = InputValidator.sanitizeObject(data)
      return appState.databaseManager.createConversation(sanitized)
    } catch (error) {
      return errorHandler(error, 'conversation:create')
    }
  })
  ipcMain.handle('conversation:get', async (_, id) => {
    if (!InputValidator.validateConversationId(id)) return null
    return appState.databaseManager.getConversation(id)
  })
  ipcMain.handle('conversation:list', async (_, filters) => {
    const sanitized = InputValidator.sanitizeObject(filters)
    return appState.databaseManager.listConversations(sanitized)
  })
  ipcMain.handle('conversation:delete', async (_, id) => {
    if (!InputValidator.validateConversationId(id)) return { success: false, error: 'Invalid ID' }
    return appState.databaseManager.deleteConversation(id)
  })
  ipcMain.handle('conversation:export', async (_, id) => {
    if (id && !InputValidator.validateConversationId(id)) return { success: false, error: 'Invalid ID' }
    return appState.databaseManager.exportData(id ? [id] : undefined)
  })

  // --- Settings Handlers ---
  ipcMain.handle('settings:get', async (_, key) => {
    const sanitizedKey = InputValidator.validateString(key, 100)
    if (!sanitizedKey) return null
    return appState.databaseManager.getSetting(sanitizedKey)
  })
  ipcMain.handle('settings:set', async (_, key, value) => {
    try {
      const sanitizedKey = InputValidator.validateString(key, 100)
      const sanitizedValue = InputValidator.validateString(value, 10000)
      
      if (!sanitizedKey) {
        throw new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: 'LOW',
          recoverable: true,
          userMessage: 'Invalid setting key',
          message: 'Invalid setting key provided',
          context: { operation: 'settings:set', component: 'IPC' }
        })
      }

      await appState.databaseManager.setSetting(sanitizedKey, sanitizedValue || '')
      
      // Apply critical settings immediately (like API keys)
      // Update the LLM router directly instead of mutating process.env (security best practice)
      if (sanitizedKey.includes('api_key') && sanitizedValue) {
        const provider = sanitizedKey.includes('openai') ? 'openai' :
                        sanitizedKey.includes('anthropic') ? 'anthropic' :
                        sanitizedKey.includes('gemini') ? 'gemini' :
                        sanitizedKey.includes('mistral') ? 'mistral' : null
        if (provider) {
          appState.processingHelper.llmHelper.llmRouter.updateApiKey(
            provider as 'openai' | 'anthropic' | 'gemini' | 'mistral',
            sanitizedValue
          )
        }
      }
      
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'settings:set')
    }
  })
  ipcMain.handle('settings:get-all', async () => appState.databaseManager.getAllSettings())
  ipcMain.handle('settings:validate-api-key', async (_, provider, key) => {
    try {
      if (!provider || !key) {
        return { valid: false, error: 'Provider and key are required' }
      }

      const sanitizedProvider = InputValidator.validateString(provider)
      const sanitizedKey = InputValidator.validateString(key, 500)
      
      if (!sanitizedProvider || !sanitizedKey) {
        return { valid: false, error: 'Invalid input' }
      }

      if (sanitizedProvider !== 'openai' && sanitizedProvider !== 'anthropic' && sanitizedProvider !== 'gemini' && sanitizedProvider !== 'mistral') {
        return { valid: false, error: 'Invalid provider' }
      }

      // Validate format first
      if (!InputValidator.validateApiKey(sanitizedProvider as 'openai' | 'anthropic' | 'gemini' | 'mistral', sanitizedKey)) {
        return { valid: false, error: 'Invalid API key format' }
      }

      // Then validate with actual API call
      const { ApiKeyValidator } = await import('./utils/ApiKeyValidator')
      const validator = new ApiKeyValidator(logger)
      const result = await validator.validateApiKey(
        sanitizedProvider as 'openai' | 'anthropic' | 'gemini' | 'mistral',
        sanitizedKey
      )

      return result
    } catch (error) {
      logger.error('IPC', 'Error validating API key', error)
      return { valid: false, error: error instanceof Error ? error.message : 'Validation failed' }
    }
  })

  // --- Shortcut Handlers ---
  ipcMain.handle('shortcuts:get-all', async () => appState.shortcutManager.getAllShortcuts())
  ipcMain.handle('shortcuts:update', async (_, action: string, key: string) => {
    const sanitizedAction = InputValidator.validateString(action, 100)
    const sanitizedKey = InputValidator.validateString(key, 100)
    if (!sanitizedAction || !sanitizedKey) {
      return { success: false, error: 'Invalid shortcut parameters' }
    }
    return appState.shortcutManager.updateShortcut(sanitizedAction, sanitizedKey)
  })
  ipcMain.handle('shortcuts:reset', async () => appState.shortcutManager.resetToDefaults())

  // --- Notes Handlers ---
  ipcMain.handle('notes:generate', async (_, conversationId: string) => {
    if (!InputValidator.validateConversationId(conversationId)) return { success: false, error: 'Invalid conversation ID' }
    return appState.notesGenerator.generateNotes(conversationId)
  })
  ipcMain.handle('notes:email', async (_, conversationId: string, recipient?: string) => {
    if (!InputValidator.validateConversationId(conversationId)) return { success: false, error: 'Invalid conversation ID' }
    const sanitizedRecipient = recipient ? InputValidator.validateString(recipient, 320) : undefined
    return appState.notesGenerator.generateFollowUpEmail(conversationId, sanitizedRecipient || undefined)
  })
  ipcMain.handle('notes:action-items', async (_, conversationId: string) => {
    if (!InputValidator.validateConversationId(conversationId)) return { success: false, error: 'Invalid conversation ID' }
    return appState.notesGenerator.extractActionItems(conversationId)
  })
  ipcMain.handle('notes:summarize', async (_, conversationId: string, maxLength?: number) => {
    if (!InputValidator.validateConversationId(conversationId)) return { success: false, error: 'Invalid conversation ID' }
    const validLength = maxLength ? InputValidator.validateNumber(maxLength, 50, 10000) : undefined
    return appState.notesGenerator.summarizeConversation(conversationId, validLength || undefined)
  })

  // Legacy handlers for backward compatibility if needed, or we just remove them
  // Keeping 'transcribe-audio' as it's used
  ipcMain.handle('transcribe-audio', async (event, buffer: Buffer) => {
    return appState.whisperClient.transcribe(buffer)
  })

  ipcMain.handle('take-screenshot', async () => {
    const screenshotPath = await appState.takeScreenshot()
    const preview = await appState.getImagePreview(screenshotPath)
    return { path: screenshotPath, preview }
  })

  ipcMain.handle('delete-screenshot', async (event, path: string) => {
    try {
      if (!InputValidator.validateFilePath(path)) {
        throw new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: 'MEDIUM',
          recoverable: true,
          userMessage: 'Invalid file path',
          message: 'Invalid file path provided',
          context: { operation: 'delete-screenshot', component: 'IPC' }
        })
      }
      return await appState.deleteScreenshot(path)
    } catch (error) {
      return errorHandler(error, 'delete-screenshot')
    }
  })

  ipcMain.handle('screen-capture-once', async () => {
    return appState.screenCaptureManager.captureOnce()
  })

  ipcMain.handle('get-screenshots', async () => {
    try {
      logger.debug('IPC', 'Getting screenshots', { view: appState.getView() })
      let previews = []
      if (appState.getView() === 'queue') {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      logger.debug('IPC', 'Retrieved screenshots', { count: previews.length })
      return previews
    } catch (error) {
      return errorHandler(error, 'get-screenshots')
    }
  })

  ipcMain.handle('toggle-window', async () => {
    appState.toggleMainWindow()
  })

  ipcMain.handle('reset-queues', async () => {
    try {
      appState.clearQueues()
      logger.info('IPC', 'Screenshot queues cleared')
      return { success: true }
    } catch (error: any) {
      return errorHandler(error, 'reset-queues')
    }
  })

  // IPC handler for analyzing audio from base64 data
  ipcMain.handle('analyze-audio-base64', async (event, data: string, mimeType: string) => {
    try {
      const sanitizedData = InputValidator.validateString(data, 50000000) // ~50MB base64 limit
      const sanitizedMime = InputValidator.validateString(mimeType, 100)
      if (!sanitizedData || !sanitizedMime) {
        return { success: false, error: 'Invalid audio data or MIME type' }
      }
      // Validate MIME type is an audio type
      const allowedMimes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/flac']
      if (!allowedMimes.includes(sanitizedMime)) {
        return { success: false, error: 'Invalid audio MIME type' }
      }
      const result = await appState.processingHelper.processAudioBase64(sanitizedData, sanitizedMime)
      return result
    } catch (error: any) {
      return errorHandler(error, 'analyze-audio-base64')
    }
  })

  // IPC handler for analyzing audio from file path
  ipcMain.handle('analyze-audio-file', async (event, path: string) => {
    try {
      if (!InputValidator.validateFilePath(path)) {
        throw new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: 'MEDIUM',
          recoverable: true,
          userMessage: 'Invalid file path',
          message: 'Invalid file path provided',
          context: { operation: 'analyze-audio-file', component: 'IPC' }
        })
      }
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      return errorHandler(error, 'analyze-audio-file')
    }
  })

  // IPC handler for analyzing image from file path
  ipcMain.handle('analyze-image-file', async (event, path: string) => {
    try {
      if (!InputValidator.validateFilePath(path)) {
        throw new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          severity: 'MEDIUM',
          recoverable: true,
          userMessage: 'Invalid file path',
          message: 'Invalid file path provided',
          context: { operation: 'analyze-image-file', component: 'IPC' }
        })
      }
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      return errorHandler(error, 'analyze-image-file')
    }
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  // ...
  ipcMain.handle(
    'set-ignore-mouse-events',
    (event, ignore: boolean, options?: { forward: boolean }) => {
      const validIgnore = InputValidator.validateBoolean(ignore)
      const validOptions = options ? { forward: InputValidator.validateBoolean(options.forward) } : undefined
      const win = appState.getMainWindow()
      if (win) {
        win.setIgnoreMouseEvents(validIgnore, validOptions)
      }
    }
  )

  ipcMain.handle('debug:toggle', async (_, enabled: boolean) => {
    const validEnabled = InputValidator.validateBoolean(enabled)
    appState.logger.setDebugMode(validEnabled)
    appState.logger.info('IPC', `Debug mode set to ${validEnabled}`)
    return true
  })

  // --- Voice Coaching ---
  ipcMain.handle('coaching:start', async () => appState.coachingManager.startCoaching())
  ipcMain.handle('coaching:stop', async () => appState.coachingManager.stopCoaching())

  // --- CRM ---
  ipcMain.handle('crm:connect', async (_, provider: string) => {
    const validProviders = ['salesforce', 'hubspot', 'pipedrive']
    const sanitizedProvider = InputValidator.validateString(provider, 50)
    if (!sanitizedProvider || !validProviders.includes(sanitizedProvider)) {
      return { success: false, error: 'Invalid CRM provider' }
    }
    return appState.crmManager.connect(sanitizedProvider as 'salesforce' | 'hubspot' | 'pipedrive')
  })
  ipcMain.handle('crm:sync', async (_, notes) => {
    const sanitized = InputValidator.sanitizeObject(notes)
    return appState.crmManager.syncMeeting('', sanitized)
  })

  // --- License & Business ---
  ipcMain.handle('license:activate', async (_, licenseKey: string, email: string) => {
    try {
      const sanitizedKey = InputValidator.validateString(licenseKey, 200)
      const sanitizedEmail = InputValidator.validateString(email, 320)
      if (!sanitizedKey || !sanitizedEmail) {
        return { success: false, error: 'Invalid license key or email' }
      }
      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format' }
      }
      const result = await appState.licenseManager.activateLicense(sanitizedKey, sanitizedEmail)
      if (result.success) {
        await appState.analyticsManager.trackConversion('trial_to_paid', appState.licenseManager.getLicenseInfo()?.tier || 'pro')
      }
      return result
    } catch (error) {
      return errorHandler(error, 'license:activate')
    }
  })

  ipcMain.handle('license:validate', async () => {
    try {
      const valid = await appState.licenseManager.validateLicense()
      return { valid, info: appState.licenseManager.getLicenseInfo() }
    } catch (error) {
      return errorHandler(error, 'license:validate')
    }
  })

  ipcMain.handle('license:get-info', async () => {
    try {
      return appState.licenseManager.getLicenseInfo()
    } catch (error) {
      return errorHandler(error, 'license:get-info')
    }
  })

  ipcMain.handle('license:get-limits', async () => {
    try {
      return appState.licenseManager.getFeatureLimits()
    } catch (error) {
      return errorHandler(error, 'license:get-limits')
    }
  })

  ipcMain.handle('license:has-feature', async (_, feature: string) => {
    try {
      const sanitizedFeature = InputValidator.validateString(feature, 100)
      if (!sanitizedFeature) return false
      return appState.licenseManager.hasFeature(sanitizedFeature as any)
    } catch (error) {
      return errorHandler(error, 'license:has-feature')
    }
  })

  ipcMain.handle('usage:get-stats', async () => {
    try {
      return await appState.usageTracker.getUsageStats()
    } catch (error) {
      return errorHandler(error, 'usage:get-stats')
    }
  })

  ipcMain.handle('usage:track-conversation', async () => {
    try {
      const result = await appState.usageTracker.trackConversation()
      await appState.analyticsManager.trackFeatureUsage('conversation')
      return result
    } catch (error) {
      return errorHandler(error, 'usage:track-conversation')
    }
  })

  ipcMain.handle('usage:track-screenshot', async () => {
    try {
      const result = await appState.usageTracker.trackScreenshot()
      await appState.analyticsManager.trackFeatureUsage('screenshot')
      return result
    } catch (error) {
      return errorHandler(error, 'usage:track-screenshot')
    }
  })

  ipcMain.handle('usage:track-audio', async (_, minutes: number) => {
    try {
      const validMinutes = InputValidator.validateNumber(minutes, 0, 480) // Max 8 hours
      if (validMinutes === null) {
        return { success: false, error: 'Invalid minutes value' }
      }
      const result = await appState.usageTracker.trackAudioMinutes(validMinutes)
      await appState.analyticsManager.trackFeatureUsage('audio', validMinutes * 60 * 1000)
      return result
    } catch (error) {
      return errorHandler(error, 'usage:track-audio')
    }
  })

  ipcMain.handle('usage:track-ai-query', async () => {
    try {
      const result = await appState.usageTracker.trackAIQuery()
      await appState.analyticsManager.trackFeatureUsage('ai_query')
      return result
    } catch (error) {
      return errorHandler(error, 'usage:track-ai-query')
    }
  })

  // --- Analytics ---
  ipcMain.handle('analytics:track', async (_, event: string, properties?: Record<string, any>) => {
    try {
      const sanitizedEvent = InputValidator.validateString(event, 200)
      if (!sanitizedEvent) {
        return { success: false, error: 'Invalid event name' }
      }
      const sanitizedProps = properties ? InputValidator.sanitizeObject(properties) : undefined
      await appState.analyticsManager.track(sanitizedEvent, sanitizedProps)
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'analytics:track')
    }
  })
}
