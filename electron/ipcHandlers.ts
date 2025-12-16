// ipcHandlers.ts

import { ipcMain, app } from 'electron'
import { AppState } from './main'

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    'update-content-dimensions',
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle('delete-screenshot', async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle('take-screenshot', async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error('Error taking screenshot:', error)
      throw error
    }
  })

  ipcMain.handle('recognize-text', async (event, path: string) => {
    // Legacy simple text
    return appState.getScreenshotHelper().recognizeText(path)
  })

  ipcMain.handle('recognize-text-advanced', async (event, image: string) => {
    // Expects base64 or path. OCRProcessor takes 'image' (tesseract accepts both path and base64).
    return appState.ocrProcessor.extractText(image)
  })

  ipcMain.handle('audio-start', async () => {
    return appState.audioCaptureManager.startCapture()
  })

  ipcMain.handle('audio-stop', async () => {
    appState.audioCaptureManager.stopCapture()
  })

  ipcMain.handle('audio-get-chunk', async () => {
    return appState.audioCaptureManager.getAudioChunk()
  })

  ipcMain.handle('audio-get-level', async () => {
    return appState.audioCaptureManager.getCurrentLevel()
  })

  ipcMain.handle('transcribe-audio', async (event, audioBuffer: Buffer) => {
    return appState.whisperClient.transcribe(audioBuffer)
  })

  ipcMain.handle('screen-capture-start', async (event, interval: number) => {
    appState.screenCaptureManager.startCapture(interval)
  })

  ipcMain.handle('screen-capture-stop', async () => {
    appState.screenCaptureManager.stopCapture()
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
