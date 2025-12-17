# Savvy AI

**Your intelligent, context-aware desktop assistant.**

Savvy AI is a powerful desktop application designed to enhance your productivity by providing real-time, context-aware assistance. It utilizes advanced perception capabilities to understand both what you see and what you hear, offering seamless support for your daily workflows.

## 🚀 Key Features

*   **Contextual OCR & Vision**: Automatically extracts text and analyzes visuals from your screen. Uses **720p optimized capture** for high performance and low latency.
*   **Audio Intelligence & VAD**: Captures system audio/microphone with **Voice Activity Detection** to ignore silence, providing real-time transcripts via Whisper.
*   **Automatic Meeting Notes**: Generates comprehensive structured notes, summaries, action items, and follow-up emails from your meetings using LLM analysis.
*   **Multi-Provider AI**: Robust LLM Router supporting **OpenAI (GPT-4o)** and **Anthropic (Claude 3.5 Sonnet)** with intelligent caching and fallback strategies.
*   **Customizable Shortcuts**: Global keyboard shortcuts for every action, fully configurable via the interface.

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

*   **Closing the App**: Use `Cmd + Q` (Mac) or `Ctrl + Q` (Windows) to quit.
*   **Screen Permissions**: Ensure you grant Screen Recording and Accessibility permissions to the app (especially on macOS) for OCR and global shortcuts.
*   **Default Shortcuts** (Customizable in Settings):
    *   `Cmd/Ctrl + B`: Toggle Overlay visibility
    *   `Cmd/Ctrl + Shift + H`: Capture Screenshot / Analyze
    *   `Cmd/Ctrl + Shift + Enter`: Generate Solution / Answer
    *   `Cmd/Ctrl + Shift + M`: Start/Stop Audio Capture

---
**Performance**: Features optimized implementation including native image resizing, audio VAD, and SQLite indexing for smooth Experience.
**Disclaimer**: This tool is intended for educational and productivity purposes. Please use responsibly.
