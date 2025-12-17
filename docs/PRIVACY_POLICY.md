# Privacy Policy

**Last Updated**: December 17, 2024

Savvy AI is designed with privacy as the core principle. We believe your data belongs to you. This policy outlines how we handle your data.

## 1. Data Collection

### Local Data
Savvy AI stores the following data **locally on your device**:
- **Screenshots**: Captured temporarily for analysis.
- **Audio Recordings**: Buffered temporarily for transcription.
- **Chat History**: Stored in a local SQLite database (`savvy_data.sqlite`).
- **Settings**: Configuration preferences.

**We do not have access to this local data.** It never leaves your machine unless you explicitly perform an action that requires third-party processing (see below).

### Third-Party Processing
To provide AI features, specific data snippets are sent to third-party API providers **only when you request it**:
- **OpenAI**: When you ask a question or use voice features, the relevant text/image/audio is sent to OpenAI's API.
- **Anthropic**: If enabled, text/code context is sent to Anthropic's API.

These providers are subject to their own privacy policies. We utilize their commercial APIs, which typically do not use your data for model training (unlike the free consumer versions).

## 2. Data Usage
We use your data solely to:
- Provide answers to your questions.
- Transcribe your meetings.
- Generate notes and summaries.

We **do not** sell, rent, or share your data with advertisers or other third parties.

## 3. Data Retention
- **Local Data**: You have full control. You can delete screenshots, clear chat history, or reset the entire database via the "Danger Zone" in Settings.
- **Third-Party**: Data sent to APIs is retained according to the provider's retention policy (usually 30 days for abuse monitoring, then deleted).

## 4. User Rights
You have the right to:
- Access your data (Export via `savvy_data.sqlite`).
- Delete your data (Clear via Settings).
- Opt-out of third-party processing (Do not configure API keys).

## 5. Contact
For privacy concerns, please contact the maintainers via the [GitHub Repository](https://github.com/Lingikaushikreddy/Savvy-AI).
