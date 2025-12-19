
export interface CRMContact {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
}

export interface CRMClientConfig {
    apiKey: string;
    baseUrl: string;
}
