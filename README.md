# Savvy AI

**Your intelligent, context-aware desktop assistant.**

Savvy AI is a powerful desktop application designed to enhance your productivity by providing real-time, context-aware assistance. It utilizes advanced perception capabilities to understand both what you see and what you hear, offering seamless support for your daily workflows.

## 🚀 Key Features

*   **Contextual OCR**: Automatically extracts and understands text from your screen, intelligently detecting the context (Code Editor, Terminal, Browser, Presentation) to provide relevant assistance. Powered by Tesseract.js.
*   **Audio Intelligence**: Captures system audio and microphone input in real-time for meeting transcriptions and insights. Powered by OpenAI Whisper.
*   **Invisible Overlay**: An always-on-top, transparent interface that sits over your applications without obstructing your workflow.
*   **Multi-Provider AI**: Features a robust LLM Router supporting **OpenAI (GPT-4o)** and **Anthropic (Claude 3.5 Sonnet)**. Automatically switches models based on the task (reasoning vs. coding).
*   **Privacy-Focused**: Process sensitive data locally where possible.

## 🛠️ Prerequisites

*   **Node.js**: Installed on your machine.
*   **Git**: For version control.
*   **API Keys**:
    *   [OpenAI API Key](https://platform.openai.com/) (Required for Vision/Reasoning & Whisper)
    *   [Anthropic API Key](https://console.anthropic.com/) (Optional, recommended for Coding tasks)

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Lingikaushikreddy/Savvy-AI.git
    cd Savvy-AI
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your keys:
    ```env
    OPENAI_API_KEY=sk-...
    ANTHROPIC_API_KEY=sk-ant-...
    ```

## 🏃‍♂️ Running the App

**Development Mode:**
To run both the React frontend and Electron backend concurrently:

```bash
npm run app:dev
```

**Build for Production:**
To create a distributable executable:

```bash
npm run app:build
```

## ⚠️ Important Usage Notes

*   **Closing the App**: Use `Cmd + Q` (Mac) or `Ctrl + Q` (Windows) to quit. The standard close button may be disabled to maintain the overlay state.
*   **Screen Permissions**: Ensure you grant Screen Recording and Accessibility permissions to the app (especially on macOS) for the OCR and global shortcuts to work.
*   **Text Selection**: Select text before triggering shortcuts for context-aware answers.
*   **Shortcuts**:
    *   `Cmd/Ctrl + B`: Toggle visibility
    *   `Cmd/Ctrl + H`: Capture Screenshot / Analyze
    *   `Cmd/Enter`: Get Solution

---
**Disclaimer**: This tool is intended for educational and productivity purposes (e.g., as a sales copilot, customer support assistant, or interview preparation aid). Please use it responsibly.
