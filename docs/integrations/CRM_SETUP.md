
# CRM Integration Setup Guide

Follow this guide to get your **Client IDs** and connect Savvy AI to your CRM.
Once you have the keys, copy them into your `.env` file.

## 1. Salesforce Setup
**Goal**: Get a `Consumer Key` (Client ID).

1.  Log in to your [Salesforce Org](https://login.salesforce.com/).
2.  Go to **Setup** (Gear icon) > **Platform Tools** > **Apps** > **App Manager**.
3.  Click **New Connected App** (top right).
4.  **Fill in Basic Info**:
    *   **Connected App Name**: `Savvy AI Local`
    *   **API Name**: `Savvy_AI_Local`
    *   **Contact Email**: Your email.
5.  **Enable OAuth Settings**:
    *   Check **Enable OAuth Settings**.
    *   **Callback URL** (IMPORTANT): Paste exactly:
        ```
        savvy-ai://auth/salesforce
        ```
    *   **Selected OAuth Scopes**: Add `Full Access (full)`, `Perform requests at any time (refresh_token, offline_access)`.
    *   Uncheck "Require Secret for Web Server Flow" if asking (since we are a desktop app).
6.  Click **Save**. Wait 2-10 minutes for changes to propagate.
7.  Click **Manage Consumer Details** to view your keys.
8.  Copy the **Consumer Key** and paste it into `.env`:
    ```env
    SALESFORCE_CLIENT_ID=your_consumer_key_here
    ```

## 2. HubSpot Setup
**Goal**: Get a `Client ID`.

1.  Log in to your [HubSpot Developer Account](https://developers.hubspot.com/). (Create one if needed).
2.  Click **Create an app**.
3.  **App Info**:
    *   **Name**: `Savvy AI Local`
4.  **Auth Tab**:
    *   **Redirect URL**: Paste exactly:
        ```
        savvy-ai://auth/hubspot
        ```
    *   **Scopes**: Add `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`.
5.  **Save**.
6.  Copy the **Client ID** and paste it into `.env`:
    ```env
    HUBSPOT_CLIENT_ID=your_client_id_here
    ```

## 3. Pipedrive Setup
**Goal**: Get a `Client ID`.

1.  Log in to Pipedrive and go to [Developer Hub](https://pipedrive.com/settings/marketplace/app-extensions).
2.  Click **Create an app** (or "Create new app").
3.  **Basic Info**:
    *   **Name**: `Savvy AI Local`
    *   **Callback URL**: Paste exactly:
        ```
        savvy-ai://auth/pipedrive
        ```
4.  **OAuth & Access**:
    *   **Scopes**: `Deals: Read/Write`, `Contacts: Read/Write`, `Activities: Read/Write`.
5.  **Save**.
6.  Copy the **Client ID** and paste it into `.env`:
    ```env
    PIPEDRIVE_CLIENT_ID=your_client_id_here
    ```

## 4. Run Locally
1.  Restart the dev server to load the `.env` changes:
    ```bash
    npm run app:dev
    ```
2.  In Savvy AI, go to **Settings > Integrations**.
3.  Click **Connect** for the service you configured.
