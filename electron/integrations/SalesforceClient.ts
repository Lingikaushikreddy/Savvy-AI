
import { CRMClient, CRMContact, CRMDeal, CRMActivity, CRMAuthDetails } from './CRMClient'
import axios from 'axios'
import { shell } from 'electron'

export class SalesforceClient implements CRMClient {
    name: 'salesforce' = 'salesforce'
    isAuthenticated: boolean = false

    private clientId: string
    private redirectUri = 'savvy-ai://auth/salesforce'
    private auth: CRMAuthDetails | null = null

    constructor(clientId: string) {
        this.clientId = clientId
    }

    getAuthUrl(): string {
        return `https://login.salesforce.com/services/oauth2/authorize?response_type=token&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}`
    }

    async authenticate(fragment: string): Promise<CRMAuthDetails> {
        // Parse token from URL fragment
        const params = new URLSearchParams(fragment)
        const accessToken = params.get('access_token')
        const instanceUrl = params.get('instance_url')

        if (!accessToken || !instanceUrl) throw new Error('Invalid OAuth response')

        this.auth = { accessToken, instanceUrl }
        this.isAuthenticated = true
        return this.auth
    }

    async refreshAuth(): Promise<void> {
        // Implement refresh flow if using offline_access
        console.log('Refresh not implemented for Implicit Grant')
    }

    // --- API Methods ---

    async findContact(email: string): Promise<CRMContact | null> {
        if (!this.auth) throw new Error('Not authenticated')

        const q = `SELECT Id, FirstName, LastName, Email FROM Contact WHERE Email = '${email}' LIMIT 1`
        const res = await axios.get(`${this.auth.instanceUrl}/services/data/v58.0/query`, {
            params: { q },
            headers: { Authorization: `Bearer ${this.auth.accessToken}` }
        })

        if (res.data.records.length === 0) return null
        const rec = res.data.records[0]
        return {
            id: rec.Id,
            firstName: rec.FirstName,
            lastName: rec.LastName,
            email: rec.Email
        }
    }

    async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
        if (!this.auth) throw new Error('Not authenticated')

        const res = await axios.post(`${this.auth.instanceUrl}/services/data/v58.0/sobjects/Contact`, {
            FirstName: contact.firstName,
            LastName: contact.lastName,
            Email: contact.email
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...contact, id: res.data.id } as CRMContact
    }

    async createDeal(deal: Partial<CRMDeal>): Promise<CRMDeal> {
        if (!this.auth) throw new Error('Not authenticated')
        // Salesforce Opportunity
        const res = await axios.post(`${this.auth.instanceUrl}/services/data/v58.0/sobjects/Opportunity`, {
            Name: deal.title,
            StageName: deal.stage || 'Prospecting',
            Amount: deal.amount,
            CloseDate: new Date().toISOString().split('T')[0] // Required field
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })

        return { ...deal, id: res.data.id } as CRMDeal
    }

    async logActivity(activity: CRMActivity): Promise<void> {
        if (!this.auth) throw new Error('Not authenticated')

        // Salesforce Task
        await axios.post(`${this.auth.instanceUrl}/services/data/v58.0/sobjects/Task`, {
            Subject: activity.subject,
            Description: activity.description,
            ActivityDate: activity.date.split('T')[0],
            Status: 'Completed',
            WhoId: activity.contacts?.[0] // First contact
        }, { headers: { Authorization: `Bearer ${this.auth.accessToken}` } })
    }

    async getDeals(): Promise<CRMDeal[]> {
        if (!this.auth) throw new Error('Not authenticated')
        const q = `SELECT Id, Name, StageName, Amount FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT 10`
        const res = await axios.get(`${this.auth.instanceUrl}/services/data/v58.0/query`, {
            params: { q },
            headers: { Authorization: `Bearer ${this.auth.accessToken}` }
        })

        return res.data.records.map((r: any) => ({
            id: r.Id,
            title: r.Name,
            stage: r.StageName,
            amount: r.Amount
        }))
    }
}
