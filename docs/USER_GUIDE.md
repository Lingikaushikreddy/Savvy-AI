# Savvy AI User Guide

Welcome to **Savvy AI**, your intelligent, context-aware desktop assistant. This guide will help you get started and make the most of the application.

## 🏁 Getting Started

### 1. Installation
Depending on your platform, download the latest release from our [Releases Page](https://github.com/Lingikaushikreddy/Savvy-AI/releases).
- **macOS**: Drag `Savvy AI.app` to your Applications folder.
- **Windows**: Run the installer `.exe`.
- **Linux**: Execute the `.AppImage`.

### 2. First Run
When you launch Savvy AI for the first time:
1. You will be prompted to grant **Screen Recording** and **Accessibility** permissions. These are required for the AI to "see" your screen and "hear" your audio.
2. Open **Settings** (Gear icon) to configure your AI providers.

### 3. Setting Up API Keys
Savvy AI uses powerful AI models that require API keys:
1. Go to **Settings**.
2. Enter your **OpenAI API Key** (Required for Vision & Voice). [Get one here](https://platform.openai.com/).
3. (Optional) Enter your **Anthropic API Key** for alternative reasoning models.

---

## 🖥️ Using the Overlay

Savvy AI runs as an unobtrusive overlay.
- **Toggle Visibility**: Press `Cmd/Ctrl + B`.
- **Ask a Question**: Type in the chat bar and press Enter.
- **Context Awareness**: The AI automatically sees what is on your screen when you ask a question.

### Keyboard Shortcuts
| Action | Default Shortcut | Description |
|--------|------------------|-------------|
| **Toggle Overlay** | `Cmd/Ctrl + B` | Show/Hide the assistant. |
| **Capture & Analyze** | `Cmd/Ctrl + Shift + H` | Takes a screenshot and analyzes it instantly. |
| **Start/Stop Listening** | `Cmd/Ctrl + Shift + M` | Toggles the microphone for voice interaction. |
| **Quick Solution** | `Cmd/Ctrl + Shift + Enter` | Generates a quick answer based on selected text. |

*Note: You can customize these shortcuts in the Settings menu.*

---

## 🚀 Key Features

### 1. Contextual Screen Analysis
Savvy AI understands your workflow. Whether you're coding in VS Code, browsing the web, or reading a PDF, the AI adapts its answers to the visible context.

### 2. Automatic Meeting Notes
The app listens to your meetings (when Audio Capture is enabled) and generates:
- **Summaries**
- **Action Items**
- **Follow-up Emails**
Simply click the "Generate Notes" button after a meeting.

### 3. Smart Coding Assistance
When you are in a code editor, Savvy AI switches to a coding-optimized model (like Claude 3.5 Sonnet) to provide better snippets and debugging help.

---

## ❓ FAQ & Troubleshooting

### Q: The AI says "Screen Permission Denied".
**A:** macOS requires explicit permission. Go to **System Settings > Privacy & Security > Screen Recording** and ensure Savvy AI is checked.

### Q: Why isn't the AI hearing me?
**A:** unique "Microphone" permission is also required. Check **System Settings > Privacy & Security > Microphone**. Also, ensure you have set a valid OpenAI API key, as it powers the transcription.

### Q: How do I reset the app?
**A:** In the Settings menu, scroll down to "Danger Zone" and click **Reset Application Data**. This will clear all chats and settings.

---

## 🆘 Support
If you encounter bugs, please [file an issue on GitHub](https://github.com/Lingikaushikreddy/Savvy-AI/issues).
