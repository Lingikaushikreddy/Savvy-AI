/**
 * AutoUpdater - Handles automatic application updates
 */

import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { Logger } from '../logging/Logger'

export class AutoUpdater {
  private logger: Logger
  private updateCheckInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

  constructor(logger: Logger) {
    this.logger = logger
    this.setupAutoUpdater()
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      this.logger.info('AutoUpdater', 'Checking for updates...')
    })

    autoUpdater.on('update-available', (info) => {
      this.logger.info('AutoUpdater', 'Update available', { version: info.version })
      this.showUpdateAvailableDialog(info)
    })

    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('AutoUpdater', 'No updates available', { version: info.version })
    })

    autoUpdater.on('error', (error) => {
      this.logger.error('AutoUpdater', 'Update error', error)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.logger.debug('AutoUpdater', 'Download progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('AutoUpdater', 'Update downloaded', { version: info.version })
      this.showUpdateDownloadedDialog()
    })
  }

  /**
   * Start checking for updates periodically
   */
  startPeriodicCheck(): void {
    // Check immediately on start
    this.checkForUpdates()

    // Then check periodically
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
      this.updateCheckInterval = null
    }
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.logger.error('AutoUpdater', 'Failed to check for updates', error)
    }
  }

  /**
   * Show dialog when update is available
   */
  private showUpdateAvailableDialog(info: any): void {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  }

  /**
   * Show dialog when update is downloaded
   */
  private showUpdateDownloadedDialog(): void {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully.',
      detail: 'The update will be installed when you restart the application.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  }
}

