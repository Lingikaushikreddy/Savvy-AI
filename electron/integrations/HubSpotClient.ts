
import { CRMClient, CRMContact, CRMDeal, CRMActivity, CRMAuthDetails } from './CRMClient'
import axios from 'axios'

export class HubSpotClient implements CRMClient {
    name: 'hubspot' = 'hubspot'
    isAuthenticated: boolean = false

    private clientId: string
    private redirectUri = 'savvy-ai://auth/hubspot'
    private auth: CRMAuthDetails | null = null

    constructor(clientId: string) {
        this.clientId = clientId
    }

    getAuthUrl(): string {
        return `https://app.hubspot.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.objects.deals.read%20crm.objects.deals.write`
    }

    async authenticate(code: string): Promise<CRMAuthDetails> {
        // HubSpot requires exchanging code for token (server-side usually, but for desktop app we might hit a proxy or do it directly if PKCE supported - assuming direct here for demo)
        // Note: Safe way is PKCE or proxy. Sticking to simplified structure for now.
        const res = await axios.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            code: code
        }))

        this.auth = {
            accessToken: res.data.access_token,
            refreshToken: res.data.refresh_token,
            expiry: Date.now() + (res.data.expires_in * 1000)
        }
        this.isAuthenticated = true
        return this.auth
    }

    async refreshAuth(): Promise<void> {
        // Refresh logic
    }

    async findContact(email: string): Promise<CRMContact | null> {
        if (!this.auth) throw new Error('Not authenticated')

        try {
            const res = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts/search', {
                filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }]
            }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

            if (res.data.results.length === 0) return null
            const rec = res.data.results[0]
            return {
                id: rec.id,
                firstName: rec.properties.firstname,
                lastName: rec.properties.lastname,
                email: rec.properties.email
            }
        } catch (e) {
            return null
        }
    }

    async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts', {
            properties: {
                firstname: contact.firstName,
                lastname: contact.lastName,
                email: contact.email
            }
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...contact, id: res.data.id } as CRMContact
    }

    async createDeal(deal: Partial<CRMDeal>): Promise<CRMDeal> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.post('https://api.hubapi.com/crm/v3/objects/deals', {
            properties: {
                dealname: deal.title,
                dealstage: deal.stage || 'appointmentscheduled',
                amount: deal.amount?.toString()
            }
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...deal, id: res.data.id } as CRMDeal
    }

    async logActivity(activity: CRMActivity): Promise<void> {
        if (!this.auth) throw new Error('Not authenticated')

        // HubSpot Engagements / Notes
        await axios.post('https://api.hubapi.com/crm/v3/objects/notes', {
            properties: {
                hs_timestamp: new Date(activity.date).getTime().toString(),
                hs_note_body: `${activity.subject}\n\n${activity.description}`
            }
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })
    }

    async getDeals(): Promise<CRMDeal[]> {
        if (!this.auth) throw new Error('Not authenticated')
        const res = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
            headers: { Authorization: `Bearer ${this.auth.accessToken}` }
        })

        return res.data.results.map((r: any) => ({
            id: r.id,
            title: r.properties.dealname,
            stage: r.properties.dealstage,
            amount: Number(r.properties.amount)
        }))
    }
}
