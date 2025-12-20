import { app, BrowserWindow } from 'electron'
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config()

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
import { NotesGenerator } from './ai/NotesGenerator'
import { PerformanceMonitor } from './monitoring/PerformanceMonitor'
import { Logger } from './logging/Logger'
import { CoachingManager } from './coaching/CoachingManager'
import { CRMManager } from './integrations/CRMManager'
import { ConfigValidator } from './utils/ConfigValidator'
import { AutoUpdater } from './utils/AutoUpdater'
import { LicenseManager } from './business/LicenseManager'
import { AnalyticsManager } from './business/AnalyticsManager'
import { UsageTracker } from './business/UsageTracker'

export class AppState {
  private static instance: AppState | null = null

  // ... existing properties
  public coachingManager: CoachingManager
  public crmManager: CRMManager

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
  public notesGenerator: NotesGenerator
  public performanceMonitor: PerformanceMonitor
  public logger: Logger
  public licenseManager: LicenseManager
  public analyticsManager: AnalyticsManager
  public usageTracker: UsageTracker

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
    // Don't start monitoring yet - will be started after app is ready

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

    // Initialize CoachingManager
    this.coachingManager = new CoachingManager(this)

    // Initialize CRMManager
    this.crmManager = new CRMManager(this)

    // Initialize Business Systems
    this.licenseManager = new LicenseManager(this.logger, this.databaseManager)
    this.analyticsManager = new AnalyticsManager(this.logger, this.databaseManager, this.licenseManager)
    this.usageTracker = new UsageTracker(this.logger, this.databaseManager, this.licenseManager)
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
    // Logging moved to WindowHelper if needed
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
  const logger = appState.logger

  // Validate configuration on startup
  const configValidator = new ConfigValidator(logger)
  const configResult = await configValidator.validateConfig()
  
  if (!configResult.valid) {
    logger.error('Main', 'Configuration validation failed', { errors: configResult.errors })
    // Show error dialog to user
    app.whenReady().then(() => {
      const { dialog } = require('electron')
      dialog.showErrorBox(
        'Configuration Error',
        `The application failed to start due to configuration errors:\n\n${configResult.errors.join('\n')}\n\nPlease check your configuration and try again.`
      )
      app.quit()
    })
    return
  }

  if (configResult.warnings.length > 0) {
    logger.warn('Main', 'Configuration warnings', { warnings: configResult.warnings })
  }

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  // Initialize Business Systems
  await appState.licenseManager.initialize()
  await appState.analyticsManager.track('app_started', {
    version: require('../package.json').version
  })

  // Initialize Shortcuts
  await appState.shortcutManager.initialize()

  app.whenReady().then(() => {
    logger.info('Main', 'App is ready')

    // Initialize auto-updater (only in production)
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
      try {
        const autoUpdater = new AutoUpdater(logger)
        autoUpdater.startPeriodicCheck()
      } catch (error) {
        logger.warn('Main', 'Auto-updater initialization failed', error)
      }
    }

    // Register protocol for OAuth callbacks
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('savvy-ai', process.execPath, [path.resolve(process.argv[1])])
      }
    } else {
      app.setAsDefaultProtocolClient('savvy-ai')
    }

    appState.createWindow()
  })

  app.on('activate', () => {
    logger.info('Main', 'App activated')
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
initializeApp().catch((error) => {
  // Logger might not be initialized yet, so use console as fallback
  console.error('Failed to initialize app:', error)
  process.exit(1)
})

