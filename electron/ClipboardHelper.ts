import { clipboard, nativeImage } from 'electron'
import { AppState } from './main'

export class ClipboardHelper {
  private lastText: string = ''
  private lastImage: string = '' // DataURL string
  private intervalId: NodeJS.Timeout | null = null
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public startMonitoring(intervalMs: number = 1000) {
    this.intervalId = setInterval(() => {
      this.checkClipboard()
    }, intervalMs)
  }

  public stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private checkClipboard() {
    const text = clipboard.readText()
    const image = clipboard.readImage()

    // Check Text
    if (text && text !== this.lastText) {
      this.lastText = text
      // Debounce/Ignore short text?
      if (text.length > 2) {
        this.appState.getMainWindow()?.webContents.send('clipboard-text-changed', text)
      }
    }

    // Check Image
    if (!image.isEmpty()) {
      const dataUrl = image.toDataURL()
      if (dataUrl !== this.lastImage) {
        this.lastImage = dataUrl
        this.appState.getMainWindow()?.webContents.send('clipboard-image-changed', dataUrl)
      }
    }
  }
}
