# Security Policy

## Local Data Processing
Savvy AI prioritizes your privacy by processing voice and CRM data locally on your device. We do not transmit your raw audio or CRM credentials to external servers for processing.


We take the security of Savvy AI seriously.

## 🔒 Data Protection

### 1. API Keys
- Your API keys (OpenAI, Anthropic) are stored locally in a secure database.
- They are **never** transmitted to any server other than the respective AI provider endpoints (`api.openai.com`, `api.anthropic.com`).
- We advise users not to share their `.env` files or database files.

### 2. Encryption
- **In-Transit**: All communication with AI providers occurs over encrypted HTTPS (TLS 1.2+).
- **At-Rest**: Local data is stored in standard SQLite files. We recommend using Full Disk Encryption (FileVault on macOS, BitLocker on Windows) to protect your local files.

## 🛡️ Vulnerability Reporting

If you discover a security vulnerability in Savvy AI, please **do not** disclose it publicly.

**Process**:
1. Email the maintainers or open a **Security Advisory** on GitHub.
2. Provide details on how to reproduce the vulnerability.
3. We will acknowledge receipt within 48 hours.
4. We will provide a timeline for a fix.

## ⚠️ Known Risks

- **Screen Capture**: The app captures your screen content. Ensure you trust the application before granting permission. The app is open-source, so you can audit the code in `electron/capture/ScreenCaptureManager.ts`.
- **Clipboard**: The app may read your clipboard to provide context validation.

## 🔄 Updates
Security patches will be released as new versions. We recommend enabling the auto-updater or checking for updates regularly.
