// ScreenshotHelper.ts

import path from 'node:path'
import fs from 'node:fs'
import { app, nativeImage } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import screenshot from 'screenshot-desktop'

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5

  private readonly screenshotDir: string
  private readonly extraScreenshotDir: string

  private view: 'queue' | 'solutions' = 'queue'

  constructor(view: 'queue' | 'solutions' = 'queue') {
    this.view = view

    // Initialize directories
    this.screenshotDir = path.join(app.getPath('userData'), 'screenshots')
    this.extraScreenshotDir = path.join(app.getPath('userData'), 'extra_screenshots')

    // Create directories if they don't exist
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir)
    }
    if (!fs.existsSync(this.extraScreenshotDir)) {
      fs.mkdirSync(this.extraScreenshotDir)
    }
  }

  public getView(): 'queue' | 'solutions' {
    return this.view
  }

  public setView(view: 'queue' | 'solutions'): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err) console.error(`Error deleting screenshot at ${screenshotPath}:`, err)
      })
    })
    this.screenshotQueue = []

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err) console.error(`Error deleting extra screenshot at ${screenshotPath}:`, err)
      })
    })
    this.extraScreenshotQueue = []
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    hideMainWindow()
    let screenshotPath = ''

    if (this.view === 'queue') {
      screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`)
      await screenshot({ filename: screenshotPath })

      this.screenshotQueue.push(screenshotPath)
      if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
        const removedPath = this.screenshotQueue.shift()
        if (removedPath) {
          try {
            await fs.promises.unlink(removedPath)
          } catch (error) {
            console.error('Error removing old screenshot:', error)
          }
        }
      }
    } else {
      screenshotPath = path.join(this.extraScreenshotDir, `${uuidv4()}.jpg`)
      await screenshot({ filename: screenshotPath, format: 'jpg' })

      // Optimize: Resize and Compress
      try {
        const image = nativeImage.createFromPath(screenshotPath)
        const resized = image.resize({ height: 720 })
        const buffer = resized.toJPEG(60)
        await fs.promises.writeFile(screenshotPath, buffer)
      } catch (e) {
        console.error('Optimization failed:', e)
      }

      this.extraScreenshotQueue.push(screenshotPath)
      if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
        const removedPath = this.extraScreenshotQueue.shift()
        if (removedPath) {
          try {
            await fs.promises.unlink(removedPath)
          } catch (error) {
            console.error('Error removing old screenshot:', error)
          }
        }
      }
    }

    showMainWindow()
    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath)
      const ext = path.extname(filepath).toLowerCase().replace('.', '') || 'png'
      return `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${data.toString('base64')}`
    } catch (error) {
      console.error('Error reading image:', error)
      throw error
    }
  }

  public async deleteScreenshot(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(path)
      if (this.view === 'queue') {
        this.screenshotQueue = this.screenshotQueue.filter((filePath) => filePath !== path)
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        )
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  public async recognizeText(filepath: string): Promise<string> {
    try {
      const { default: Tesseract } = await import('tesseract.js')
      const {
        data: { text }
      } = await Tesseract.recognize(filepath, 'eng')
      return text
    } catch (error) {
      console.error('OCR Error:', error)
      return ''
    }
  }
}
