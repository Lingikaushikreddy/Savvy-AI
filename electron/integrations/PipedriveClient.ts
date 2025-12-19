
import { CRMClient, CRMContact, CRMDeal, CRMActivity, CRMAuthDetails } from './CRMClient'
import axios from 'axios'

export class PipedriveClient implements CRMClient {
    name: 'pipedrive' = 'pipedrive'
    isAuthenticated: boolean = false

    private clientId: string
    private redirectUri = 'savvy-ai://auth/pipedrive'
    private auth: CRMAuthDetails | null = null
    private apiUrl = 'https://api.pipedrive.com/v1'

    constructor(clientId: string) {
        this.clientId = clientId
    }

    getAuthUrl(): string {
        return `https://oauth.pipedrive.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}`
    }

    async authenticate(code: string): Promise<CRMAuthDetails> {
        // Pipedrive Exchange
        const res = await axios.post('https://oauth.pipedrive.com/oauth/token', new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            code: code
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

        this.auth = { accessToken: res.data.access_token } // Simplified
        this.isAuthenticated = true
        return this.auth
    }

    async refreshAuth(): Promise<void> {
        // Refresh
    }

    async findContact(email: string): Promise<CRMContact | null> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.get(`${this.apiUrl}/persons/search`, {
            params: { term: email, exact_match: true },
            headers: { Authorization: `Bearer ${this.auth.accessToken}` }
        })

        if (res.data.data.items.length === 0) return null
        const rec = res.data.data.items[0].item
        return {
            id: rec.id,
            firstName: rec.name.split(' ')[0],
            lastName: rec.name.split(' ').slice(1).join(' '),
            email: email
        }
    }

    async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.post(`${this.apiUrl}/persons`, {
            name: `${contact.firstName} ${contact.lastName}`,
            email: [contact.email]
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...contact, id: res.data.data.id } as CRMContact
    }

    async createDeal(deal: Partial<CRMDeal>): Promise<CRMDeal> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.post(`${this.apiUrl}/deals`, {
            title: deal.title,
            value: deal.amount,
            currency: 'USD'
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...deal, id: res.data.data.id } as CRMDeal
    }

    async logActivity(activity: CRMActivity): Promise<void> {
        if (!this.auth) throw new Error('Not authenticated')

        // Pipedrive Activity
        await axios.post(`${this.apiUrl}/activities`, {
            subject: activity.subject,
            note: activity.description,
            type: 'meeting',
            done: 1,
            due_date: new Date(activity.date).toISOString().split('T')[0]
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })
    }

    async getDeals(): Promise<CRMDeal[]> {
        if (!this.auth) throw new Error('Not authenticated')
        const res = await axios.get(`${this.apiUrl}/deals`, {
            params: { status: 'open', limit: 10 },
            headers: { Authorization: `Bearer ${this.auth.accessToken}` }
        })

        return (res.data.data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            amount: r.value
            // Pipedrive stages are IDs, would need mapping
        }))
    }
}
