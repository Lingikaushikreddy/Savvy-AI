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
    const context = await appState.contextBuilder.buildContext()
    const model = await appState.databaseManager.getSetting('ai.model')
    // We need to access LLMHandler/Router. 
    // AppState doesn't expose it directly yet, but ProcessingHelper does.
    // Or we should add it to AppState.
    // For now using ProcessingHelper's LLM access via LLMRouter which is in LLMHelper
    // Actually we should expose LLMRouter on AppState or create a new instance?
    // Let's use the one in ProcessingHelper
    return appState.processingHelper.llmHelper.llmRouter.complete(context, {
      model: model || undefined
    }) // Need to update LLMHelper to public expose router or wrapper
  })

  ipcMain.on('ai:stream', async (event, question: string) => {
    const context = await appState.contextBuilder.buildContext()
    const model = await appState.databaseManager.getSetting('ai.model')
    const stream = appState.processingHelper.llmHelper.llmRouter.stream(context, {
      model: model || undefined
    })

    for await (const chunk of stream) {
      event.reply('ai:stream-chunk', chunk)
    }
    event.reply('ai:stream-end')
  })

  ipcMain.handle('ai:stop', async () => {
    // Implement stop generation logic if supported by router
  })

  ipcMain.handle('ai:clear-context', async () => {
    // Clear context builder cache or appState queues
    appState.clearQueues()
  })

  ipcMain.handle('context:analyze', async (_, transcript: string, screenText: string) => {
    return appState.contextAnalyzer.analyzeContext(transcript, screenText || '')
  })

  // --- Conversation Handlers ---
  ipcMain.handle('conversation:create', async (_, data) => appState.databaseManager.createConversation(data))
  ipcMain.handle('conversation:get', async (_, id) => appState.databaseManager.getConversation(id))
  ipcMain.handle('conversation:list', async (_, filters) => appState.databaseManager.listConversations(filters))
  ipcMain.handle('conversation:delete', async (_, id) => appState.databaseManager.deleteConversation(id))
  ipcMain.handle('conversation:export', async (_, id) => appState.databaseManager.exportData(id ? [id] : undefined))

  // --- Settings Handlers ---
  ipcMain.handle('settings:get', async (_, key) => appState.databaseManager.getSetting(key))
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
      if (sanitizedKey.includes('api_key')) {
        // Update router config if needed
        const provider = sanitizedKey.includes('openai') ? 'openai' : 
                        sanitizedKey.includes('anthropic') ? 'anthropic' : null
        if (provider && sanitizedValue) {
          // Router will pick up from env or database on next request
          process.env[`${provider.toUpperCase()}_API_KEY`] = sanitizedValue
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

      if (sanitizedProvider !== 'openai' && sanitizedProvider !== 'anthropic') {
        return { valid: false, error: 'Invalid provider' }
      }

      // Validate format first
      if (!InputValidator.validateApiKey(sanitizedProvider as 'openai' | 'anthropic', sanitizedKey)) {
        return { valid: false, error: 'Invalid API key format' }
      }

      // Then validate with actual API call
      const { ApiKeyValidator } = await import('./utils/ApiKeyValidator')
      const validator = new ApiKeyValidator(logger)
      const result = await validator.validateApiKey(
        sanitizedProvider as 'openai' | 'anthropic',
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
  ipcMain.handle('shortcuts:update', async (_, action: string, key: string) => appState.shortcutManager.updateShortcut(action, key))
  ipcMain.handle('shortcuts:reset', async () => appState.shortcutManager.resetToDefaults())

  // --- Notes Handlers ---
  ipcMain.handle('notes:generate', async (_, conversationId: string) => appState.notesGenerator.generateNotes(conversationId))
  ipcMain.handle('notes:email', async (_, conversationId: string, recipient?: string) => appState.notesGenerator.generateFollowUpEmail(conversationId, recipient))
  ipcMain.handle('notes:action-items', async (_, conversationId: string) => appState.notesGenerator.extractActionItems(conversationId))
  ipcMain.handle('notes:summarize', async (_, conversationId: string, maxLength?: number) => appState.notesGenerator.summarizeConversation(conversationId, maxLength))

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
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
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
      const win = appState.getMainWindow()
      if (win) {
        win.setIgnoreMouseEvents(ignore, options)
      }
    }
  )

  ipcMain.handle('debug:toggle', async (_, enabled: boolean) => {
    appState.logger.setDebugMode(enabled)
    appState.logger.info('IPC', `Debug mode set to ${enabled}`)
    return true
  })

  // --- Voice Coaching ---
  ipcMain.handle('coaching:start', async () => appState.coachingManager.startCoaching())
  ipcMain.handle('coaching:stop', async () => appState.coachingManager.stopCoaching())

  // --- CRM ---
  ipcMain.handle('crm:connect', async (_, provider: 'salesforce' | 'hubspot' | 'pipedrive') => appState.crmManager.connect(provider))
  ipcMain.handle('crm:sync', async (_, notes) => appState.crmManager.syncMeeting('', notes))

  // --- License & Business ---
  ipcMain.handle('license:activate', async (_, licenseKey: string, email: string) => {
    try {
      const result = await appState.licenseManager.activateLicense(licenseKey, email)
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
      return appState.licenseManager.hasFeature(feature as any)
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
      const result = await appState.usageTracker.trackAudioMinutes(minutes)
      await appState.analyticsManager.trackFeatureUsage('audio', minutes * 60 * 1000)
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
      await appState.analyticsManager.track(event, properties)
      return { success: true }
    } catch (error) {
      return errorHandler(error, 'analytics:track')
    }
  })
}
