# CRM Integrations

This module handles connections to third-party CRM providers.

## Supported Providers
- Salesforce
- HubSpot
- Pipedrive

## Adding a Provider
1. Implement `CRMClient` interface.
2. Add provider enum in `CRMManager`.
3. Register client in `CRMManager` factory.
