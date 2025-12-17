
import { globalShortcut, app, BrowserWindow } from 'electron'
import { AppState } from '../main'

export interface ShortcutConfig {
    key: string
    description: string
    action: string
    enabled: boolean
}

export type ShortcutMap = Record<string, ShortcutConfig>

export class ShortcutManager {
    private appState: AppState
    private shortcuts: ShortcutMap = {}
    private isInitialized = false

    // Default Configuration
    private readonly DEFAULTS: ShortcutMap = {
        'ai:query': { key: 'CommandOrControl+Shift+A', description: 'Trigger AI Query', action: 'ai:query', enabled: true },
        'window:toggle': { key: 'CommandOrControl+Shift+H', description: 'Show/Hide Overlay', action: 'window:toggle', enabled: true },
        'capture:toggle': { key: 'CommandOrControl+Shift+C', description: 'Start/Stop Capture', action: 'capture:toggle', enabled: true },
        'response:clear': { key: 'CommandOrControl+K', description: 'Clear Response', action: 'response:clear', enabled: true },
        'settings:open': { key: 'CommandOrControl+Shift+S', description: 'Open Settings', action: 'settings:open', enabled: true },
        'app:restart': { key: 'CommandOrControl+Shift+R', description: 'Restart App', action: 'app:restart', enabled: true },
        'app:quit': { key: 'CommandOrControl+Shift+Q', description: 'Quit App', action: 'app:quit', enabled: true },
        'op:cancel': { key: 'Escape', description: 'Cancel Operation', action: 'op:cancel', enabled: true },

        // Window Movement (Preserved)
        'window:left': { key: 'CommandOrControl+Left', description: 'Move Window Left', action: 'window:left', enabled: true },
        'window:right': { key: 'CommandOrControl+Right', description: 'Move Window Right', action: 'window:right', enabled: true },
        'window:up': { key: 'CommandOrControl+Up', description: 'Move Window Up', action: 'window:up', enabled: true },
        'window:down': { key: 'CommandOrControl+Down', description: 'Move Window Down', action: 'window:down', enabled: true },
    }

    constructor(appState: AppState) {
        this.appState = appState
    }

    public async initialize() {
        if (this.isInitialized) return

        // Load custom shortcuts from DB
        const saved = await this.appState.databaseManager.getSetting('app.shortcuts')

        if (saved) {
            try {
                const parsed = JSON.parse(saved) as ShortcutMap
                // Merge saved with defaults to ensure new defaults appear
                this.shortcuts = { ...this.DEFAULTS, ...parsed }
            } catch (e) {
                console.error('Failed to parse saved shortcuts:', e)
                this.shortcuts = { ...this.DEFAULTS }
            }
        } else {
            this.shortcuts = { ...this.DEFAULTS }
            await this.saveShortcuts()
        }

        this.registerAll()
        this.isInitialized = true
    }

    private async saveShortcuts() {
        await this.appState.databaseManager.setSetting('app.shortcuts', JSON.stringify(this.shortcuts))
    }

    private registerAll() {
        globalShortcut.unregisterAll()

        Object.entries(this.shortcuts).forEach(([action, config]) => {
            if (config.enabled && config.key) {
                try {
                    globalShortcut.register(config.key, () => this.handleShortcut(action))
                } catch (e) {
                    console.error(`Error registering shortcut ${config.key}:`, e)
                }
            }
        })
    }

    private handleShortcut(action: string) {
        console.log(`Shortcut triggered: ${action}`)
        const mw = this.appState.getMainWindow()

        // Visual Feedback
        if (mw && !mw.isDestroyed()) {
            mw.webContents.send('shortcut:triggered', action)
        }

        // Action Dispatch
        switch (action) {
            case 'ai:query':
                // Trigger context analysis or query logic
                // Typically requires user input, but maybe triggers "Listening" or "Take Screenshot + Analyze"
                // For now, let's assume it brings up the input or triggers the query flow if context is ready
                // Or maybe simulates 'Command+Enter' behavior from old shortcuts
                this.appState.showMainWindow()
                mw?.webContents.send('trigger:ai')
                break

            case 'window:toggle':
                this.appState.toggleMainWindow()
                break

            case 'capture:toggle':
                if (this.appState.screenCaptureManager.isCapturing || this.appState.audioCaptureManager.isCapturing) {
                    this.appState.screenCaptureManager.stopCapture()
                    this.appState.audioCaptureManager.stopCapture()
                } else {
                    this.appState.screenCaptureManager.startCapture(2000)
                    this.appState.audioCaptureManager.startCapture()
                }
                break

            case 'response:clear':
                mw?.webContents.send('trigger:clear')
                break

            case 'settings:open':
                mw?.webContents.send('trigger:settings')
                this.appState.showMainWindow()
                break

            case 'app:restart':
                app.relaunch()
                app.exit(0)
                break

            case 'app:quit':
                app.quit()
                break

            case 'op:cancel':
                this.appState.processingHelper.cancelOngoingRequests()
                // Also maybe hide window if it's open? Or just stop generation?
                break

            case 'window:left': this.appState.moveWindowLeft(); break;
            case 'window:right': this.appState.moveWindowRight(); break;
            case 'window:up': this.appState.moveWindowUp(); break;
            case 'window:down': this.appState.moveWindowDown(); break;
        }
    }

    // --- Public API ---

    public async updateShortcut(action: string, newKey: string) {
        if (!this.shortcuts[action]) {
            throw new Error(`Unknown action: ${action}`)
        }

        // Validate
        if (this.isRegistered(newKey) && this.shortcuts[action].key !== newKey) {
            throw new Error(`Shortcut ${newKey} is already in use`)
        }

        this.shortcuts[action].key = newKey
        this.registerAll() // Re-register everything to apply changes
        await this.saveShortcuts()
    }

    public async setEnabled(action: string, enabled: boolean) {
        if (!this.shortcuts[action]) return
        this.shortcuts[action].enabled = enabled
        this.registerAll()
        await this.saveShortcuts()
    }

    public getAllShortcuts(): ShortcutMap {
        return this.shortcuts
    }

    public isRegistered(key: string): boolean {
        return Object.values(this.shortcuts).some(s => s.key === key && s.enabled)
    }

    public async resetToDefaults() {
        this.shortcuts = { ...this.DEFAULTS }
        this.registerAll()
        await this.saveShortcuts()
    }
}
