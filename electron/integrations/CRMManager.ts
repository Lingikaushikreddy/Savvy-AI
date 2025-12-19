
import { CRMClient } from './CRMClient'
import { SalesforceClient } from './SalesforceClient'
import { HubSpotClient } from './HubSpotClient'
import { PipedriveClient } from './PipedriveClient'
import { AppState } from '../main'
import { shell } from 'electron'

export class CRMManager {
    private appState: AppState
    private activeClient: CRMClient | null = null

    // Clients
    private salesforce: SalesforceClient
    private hubspot: HubSpotClient
    private pipedrive: PipedriveClient

    constructor(appState: AppState) {
        this.appState = appState
        this.salesforce = new SalesforceClient(process.env.SALESFORCE_CLIENT_ID || 'demo_sf_id')
        this.hubspot = new HubSpotClient(process.env.HUBSPOT_CLIENT_ID || 'demo_hs_id')
        this.pipedrive = new PipedriveClient(process.env.PIPEDRIVE_CLIENT_ID || 'demo_pd_id')
    }

    public getActiveClient(): CRMClient | null {
        return this.activeClient
    }

    public async connect(provider: 'salesforce' | 'hubspot' | 'pipedrive') {
        let authUrl = ''
        switch (provider) {
            case 'salesforce':
                authUrl = this.salesforce.getAuthUrl()
                this.activeClient = this.salesforce
                break
            case 'hubspot':
                authUrl = this.hubspot.getAuthUrl()
                this.activeClient = this.hubspot
                break
            case 'pipedrive':
                authUrl = this.pipedrive.getAuthUrl()
                this.activeClient = this.pipedrive
                break
            default:
                throw new Error('Provider not implemented')
        }

        await shell.openExternal(authUrl)
    }

    public async handleCallback(url: string) {
        // savvy-ai://auth/provider?code=... or #access_token=...

        if (this.activeClient?.name === 'salesforce' && url.includes('salesforce')) {
            const fragment = url.split('#')[1]
            if (fragment) await this.salesforce.authenticate(fragment)
        }
        else if (this.activeClient?.name === 'hubspot' && url.includes('hubspot')) {
            const code = new URL(url).searchParams.get('code')
            if (code) await this.hubspot.authenticate(code)
        }
        else if (this.activeClient?.name === 'pipedrive' && url.includes('pipedrive')) {
            const code = new URL(url).searchParams.get('code')
            if (code) await this.pipedrive.authenticate(code)
        }
    }

    public async syncMeeting(transcript: string, meetingNotes: any) {
        if (!this.activeClient || !this.activeClient.isAuthenticated) {
            throw new Error('No CRM connected')
        }

        // 1. Log Activity
        await this.activeClient.logActivity({
            subject: `Meeting: ${meetingNotes.title || 'Savvy AI Meeting'}`,
            description: `Summary: ${meetingNotes.summary}\n\nActions:\n${meetingNotes.actionItems.join('\n')}`,
            date: new Date().toISOString()
        })

        // 2. Create Tasks?
        // ...
    }
}
