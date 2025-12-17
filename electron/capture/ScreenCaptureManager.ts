import { desktopCapturer, shell, systemPreferences, BrowserWindow } from 'electron'
import activeWindow from 'active-win'

export interface WindowInfo {
  title: string
  appName: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CaptureResult {
  screenshot: string // base64
  window: WindowInfo
  timestamp: number
}

export class ScreenCaptureManager {
  private intervalId: NodeJS.Timeout | null = null
  public isCapturing: boolean = false
  private monitorInterval: number = 2000
  private lastCapture: string | null = null

  constructor() { }

  public startCapture(interval: number = 2000): void {
    if (this.isCapturing) return
    this.isCapturing = true
    this.monitorInterval = interval

    // Start polling
    this.intervalId = setInterval(async () => {
      try {
        const result = await this.captureOnce()
        if (result) {
          // Emit event to main process or renderer
          // For now, logging, or we can use a callback if we refactor constructor to accept one
          // or use an EventEmitter structure.
          // But per requirements, just implementing the class structure first.
          console.log('Captured:', result.window.title)
        }
      } catch (error) {
        console.error('Screen capture error:', error)
      }
    }, this.monitorInterval)
  }

  public stopCapture(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isCapturing = false
  }

  public async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      const result = await activeWindow({
        screenRecordingPermission: false,
        accessibilityPermission: false
      })
      if (!result) return null

      return {
        title: result.title,
        appName: result.owner.name,
        bounds: {
          x: result.bounds.x,
          y: result.bounds.y,
          width: result.bounds.width,
          height: result.bounds.height
        }
      }
    } catch (error) {
      // Fallback or permission error
      console.error('Failed to get active window:', error)
      return null
    }
  }

  public async captureOnce(): Promise<CaptureResult | null> {
    // 1. Get active window info
    const windowInfo = await this.getActiveWindow()
    if (!windowInfo) return null

    // Check permissions on macOS
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen')
      if (status !== 'granted') {
        // We can't prompt easily from here usually, but we can check
        console.warn('Screen recording permission not granted')
        return null
      }
    }

    // 2. Capture sources using desktopCapturer
    // We want to capture the window specifically if possible to get clean output
    // OR capture screen and crop. capturing window directly is better if 'active-win' gives us an ID we can match.
    // active-win gives 'id' (OS specific).
    // desktopCapturer.getSources returns 'id' (Electron specific 'window:1234').
    // Matching them is notoriously hard.
    // Strategy: Capture entire screen and crop? Or try to fuzzy match title.

    // Let's try to find the window in sources by name/title first.

    // Optimize: Limit resolution to 720p height for OCR performance
    const scale = Math.min(1, 720 / (windowInfo.bounds.height || 720))
    const targetWidth = Math.floor((windowInfo.bounds.width || 1280) * scale)
    const targetHeight = Math.floor((windowInfo.bounds.height || 720) * scale)

    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: targetWidth, height: targetHeight },
      fetchWindowIcons: false
    })

    // Try to find matching source
    const matchedSource = sources.find(
      (s) =>
        s.name.includes(windowInfo.title) || (windowInfo.title && s.name.includes(windowInfo.title))
    )

    let base64Image = ''

    if (matchedSource) {
      // Optimize: Compress using JPEG at 60% quality
      base64Image = `data:image/jpeg;base64,${matchedSource.thumbnail.toJPEG(60).toString('base64')}`
    } else {
      // Fallback
      const screenSource = sources.find(
        (s) => s.name.includes('Screen 1') || s.name.includes('Entire Screen')
      )
      if (screenSource) {
        base64Image = `data:image/jpeg;base64,${screenSource.thumbnail.toJPEG(60).toString('base64')}`
      }
    }

    if (!base64Image) return null

    // Optimization: Simple Diff (String comparison)
    if (base64Image === this.lastCapture) {
      return null // No change
    }
    this.lastCapture = base64Image

    return {
      screenshot: base64Image,
      window: windowInfo,
      timestamp: Date.now()
    }
  }
}
