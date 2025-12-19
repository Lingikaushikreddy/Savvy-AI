
export interface CRMContact {
    id: string
    firstName: string
    lastName: string
    email: string
    company?: string
}

export interface CRMDeal {
    id: string
    title: string
    stage?: string
    amount?: number
}

export interface CRMActivity {
    subject: string
    description: string
    date: string
    duration?: number // minutes
    contacts?: string[] // IDs
    deal?: string // ID
}

export interface CRMAuthDetails {
    accessToken: string
    refreshToken?: string
    expiry?: number
    instanceUrl?: string // For Salesforce
}

export interface CRMClient {
    name: 'salesforce' | 'hubspot' | 'pipedrive'
    isAuthenticated: boolean

    // Auth
    getAuthUrl(): string
    authenticate(code: string): Promise<CRMAuthDetails>
    refreshAuth(): Promise<void>

    // Sync Operations
    findContact(email: string): Promise<CRMContact | null>
    createContact(contact: Partial<CRMContact>): Promise<CRMContact>
    createDeal(deal: Partial<CRMDeal>): Promise<CRMDeal>
    logActivity(activity: CRMActivity): Promise<void>
    getDeals(): Promise<CRMDeal[]>
}
