import { app, BrowserWindow } from 'electron'
import { initializeIpcHandlers } from './ipcHandlers'
import { WindowHelper } from './WindowHelper'
import { ScreenshotHelper } from './ScreenshotHelper'
import { ShortcutManager } from './shortcuts/ShortcutManager'
import { ProcessingHelper } from './ProcessingHelper'
import { ClipboardHelper } from './ClipboardHelper'
import { ScreenCaptureManager } from './capture/ScreenCaptureManager'
import { OCRProcessor } from './capture/OCRProcessor'
import { AudioCaptureManager } from './audio/AudioCaptureManager'
import { WhisperClient } from './audio/WhisperClient'
import { DatabaseManager } from './database/DatabaseManager'
import { ContextAnalyzer } from './ai/ContextAnalyzer'
import { ContextBuilder } from './ai/ContextBuilder'

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutManager: ShortcutManager
  public processingHelper: ProcessingHelper
  private clipboardHelper: ClipboardHelper
  public screenCaptureManager: ScreenCaptureManager
  public ocrProcessor: OCRProcessor
  public audioCaptureManager: AudioCaptureManager
  public whisperClient: WhisperClient
  public databaseManager: DatabaseManager
  public contextBuilder: ContextBuilder
  public contextAnalyzer: ContextAnalyzer

  // View management
  private view: 'queue' | 'solutions' = 'queue'

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null

  private hasDebugged: boolean = false

  // Processing events
  public readonly PROCESSING_EVENTS = {
    UNAUTHORIZED: 'procesing-unauthorized',
    NO_SCREENSHOTS: 'processing-no-screenshots',
    INITIAL_START: 'initial-start',
    PROBLEM_EXTRACTED: 'problem-extracted',
    SOLUTION_SUCCESS: 'solution-success',
    INITIAL_SOLUTION_ERROR: 'solution-error',
    DEBUG_START: 'debug-start',
    DEBUG_SUCCESS: 'debug-success',
    DEBUG_ERROR: 'debug-error'
  } as const

  constructor() {
    // Initialize WindowHelper
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutManager
    this.shortcutManager = new ShortcutManager(this)

    // Initialize ClipboardHelper
    this.clipboardHelper = new ClipboardHelper(this)
    this.clipboardHelper.startMonitoring()

    // Initialize ScreenCaptureManager
    this.screenCaptureManager = new ScreenCaptureManager()

    // Initialize OCRProcessor
    this.ocrProcessor = new OCRProcessor()

    // Initialize AudioCaptureManager
    this.audioCaptureManager = new AudioCaptureManager()

    // Initialize WhisperClient
    this.whisperClient = new WhisperClient()

    // Initialize DatabaseManager
    this.databaseManager = new DatabaseManager()

    // Initialize ContextAnalyzer
    this.contextAnalyzer = new ContextAnalyzer(this.processingHelper.llmHelper)

    // Initialize ContextBuilder
    this.contextBuilder = new ContextBuilder(this)
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): 'queue' | 'solutions' {
    return this.view
  }

  public setView(view: 'queue' | 'solutions'): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      'Screenshots: ',
      this.screenshotHelper.getScreenshotQueue().length,
      'Extra screenshots: ',
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView('queue')
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error('No main window available')

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(path: string): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  // Initialize Shortcuts
  await appState.shortcutManager.initialize()

  app.whenReady().then(() => {
    console.log('App is ready')
    appState.createWindow()
  })

  app.on('activate', () => {
    console.log('App activated')
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.dock?.hide() // Hide dock icon (optional)
  app.commandLine.appendSwitch('disable-background-timer-throttling')
}

// Start the application
initializeApp().catch(console.error)

