// ipcHandlers.ts

import { ipcMain, app } from 'electron'
import { AppState } from './main'

export function initializeIpcHandlers(appState: AppState): void {
  // --- Window Handlers ---
  ipcMain.handle('window:show', async () => appState.showMainWindow())
  ipcMain.handle('window:hide', async () => appState.hideMainWindow())
  ipcMain.handle('window:toggle', async () => appState.toggleMainWindow())
  ipcMain.handle('window:move', async (_, x: number, y: number) => {
    // Implement direct move if needed, or mapping to existing move methods
    // For now, these are specific directional moves in AppState, 
    // we might need a generic setPosition in WindowHelper
    // appState.getMainWindow()?.setPosition(x, y) 
    // Keeping existing behavior for directional moves if requested
  })
  ipcMain.handle('window:resize', async (_, width: number, height: number) => {
    appState.setWindowDimensions(width, height)
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

  // --- Conversation Handlers ---
  ipcMain.handle('conversation:create', async (_, data) => appState.databaseManager.createConversation(data))
  ipcMain.handle('conversation:get', async (_, id) => appState.databaseManager.getConversation(id))
  ipcMain.handle('conversation:list', async (_, filters) => appState.databaseManager.listConversations(filters))
  ipcMain.handle('conversation:delete', async (_, id) => appState.databaseManager.deleteConversation(id))
  ipcMain.handle('conversation:export', async (_, id) => appState.databaseManager.exportData(id ? [id] : undefined))

  // --- Settings Handlers ---
  ipcMain.handle('settings:get', async (_, key) => appState.databaseManager.getSetting(key))
  ipcMain.handle('settings:set', async (_, key, value) => {
    await appState.databaseManager.setSetting(key, value)
    // Apply critical settings immediately (like API keys)
    if (key.includes('api_key')) {
      // Update env or router config
    }
  })
  ipcMain.handle('settings:get-all', async () => appState.databaseManager.getAllSettings())
  ipcMain.handle('settings:validate-api-key', async (_, provider, key) => {
    // Implement validation logic
    return true
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
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle('screen-capture-once', async () => {
    return appState.screenCaptureManager.captureOnce()
  })

  ipcMain.handle('get-screenshots', async () => {
    console.log({ view: appState.getView() })
    try {
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
      previews.forEach((preview: any) => console.log(preview.path))
      return previews
    } catch (error) {
      console.error('Error getting screenshots:', error)
      throw error
    }
  })

  ipcMain.handle('toggle-window', async () => {
    appState.toggleMainWindow()
  })

  ipcMain.handle('reset-queues', async () => {
    try {
      appState.clearQueues()
      console.log('Screenshot queues have been cleared.')
      return { success: true }
    } catch (error: any) {
      console.error('Error resetting queues:', error)
      return { success: false, error: error.message }
    }
  })

  // IPC handler for analyzing audio from base64 data
  ipcMain.handle('analyze-audio-base64', async (event, data: string, mimeType: string) => {
    try {
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
      return result
    } catch (error: any) {
      console.error('Error in analyze-audio-base64 handler:', error)
      throw error
    }
  })

  // IPC handler for analyzing audio from file path
  ipcMain.handle('analyze-audio-file', async (event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      console.error('Error in analyze-audio-file handler:', error)
      throw error
    }
  })

  // IPC handler for analyzing image from file path
  ipcMain.handle('analyze-image-file', async (event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      console.error('Error in analyze-image-file handler:', error)
      throw error
    }
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })

  ipcMain.handle(
    'set-ignore-mouse-events',
    (event, ignore: boolean, options?: { forward: boolean }) => {
      const win = appState.getMainWindow()
      if (win) {
        win.setIgnoreMouseEvents(ignore, options)
      }
    }
  )
}
