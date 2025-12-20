import { AppState } from '../main'
import { Logger } from '../logging/Logger'
import activeWindow from 'active-win'

export class MeetingDetector {
    private appState: AppState
    private logger: Logger
    private interval: NodeJS.Timeout | null = null
    private readonly POLL_INTERVAL = 5000 // 5 seconds
    private lastMeetingState: boolean = false

    // Known meeting apps
    private readonly MEETING_APPS = [
        'zoom.us',
        'zoom',
        'microsoft teams',
        'teams',
        'google chrome', // Need to check title for "Meet"
        'chrome',
        'brave',
        'firefox',
        'safari',
        'webex',
        'slack'
    ]

    private readonly MEETING_TITLES = [
        'zoom meeting',
        'meet - ', // Google Meet
        'google meet',
        'microsoft teams',
        'webex meeting'
    ]

    constructor(appState: AppState) {
        this.appState = appState
        this.logger = appState.logger
    }

    public startMonitoring() {
        if (this.interval) return
        this.logger.info('MeetingDetector', 'Started monitoring for meetings')
        this.interval = setInterval(() => this.checkActiveWindow(), this.POLL_INTERVAL)
    }

    public stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
            this.logger.info('MeetingDetector', 'Stopped monitoring')
        }
    }

    private async checkActiveWindow() {
        try {
            const result = await activeWindow()
            if (!result) return

            const isMeetingApp = this.MEETING_APPS.some(app =>
                result.owner.name.toLowerCase().includes(app) ||
                result.owner.name.toLowerCase().includes('zoom') // safety catch
            )

            if (!isMeetingApp) return

            const title = result.title.toLowerCase()
            const isMeeting = this.MEETING_TITLES.some(t => title.includes(t))

            if (isMeeting && !this.lastMeetingState) {
                this.handleMeetingStart(result.owner.name, result.title)
            } else if (!isMeeting && this.lastMeetingState) {
                this.handleMeetingEnd()
            }

            this.lastMeetingState = isMeeting
        } catch (error) {
            this.logger.error('MeetingDetector', 'Error checking active window', error)
        }
    }

    private handleMeetingStart(appName: string, title: string) {
        this.logger.info('MeetingDetector', 'Meeting detected', { app: appName, title })

        // Notify Frontend
        const win = this.appState.getMainWindow()
        if (win) {
            win.webContents.send('meeting:detected', { app: appName, title })
        }

        // Auto-start coaching if Pro and configured (future)
        if (this.appState.licenseManager.hasFeature('voiceCoaching')) {
             // We could auto-start, but for now let's just notify
             // this.appState.coachingManager.startCoaching()
        }
    }

    private handleMeetingEnd() {
        this.logger.info('MeetingDetector', 'Meeting ended')

        const win = this.appState.getMainWindow()
        if (win) {
            win.webContents.send('meeting:ended')
        }
    }
}
