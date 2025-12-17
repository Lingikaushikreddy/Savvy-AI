# Savvy AI Developer Guide

This guide is for developers who want to build from source, contribute, or understand the architecture of Savvy AI.

## 🏗️ Architecture Overview

Savvy AI is an **Electron** application built with:
- **Frontend**: React, TypeScript, TailwindCSS, Vite.
- **Backend (Main Process)**: Electron, Node.js, SQLite (better-sqlite3).
- **AI**: OpenAI (GPT-4o, Whisper), Anthropic (Claude 3.5).
- **Perception**: 
  - Vision: `screenshot-desktop`, `sharp` (resizing).
  - Audio: `mic` (16kHz raw stream), Voice Activity Detection (RMS).

### Directory Structure
```
├── electron/           # Main Process Code
│   ├── ai/             # LLM Router, Context Builders
│   ├── capture/        # Screen Capture Logic
│   ├── audio/          # Audio/Microphone Logic
│   ├── database/       # SQLite Manager
│   ├── logging/        # Logger Implementation
│   ├── main.ts         # Entry Point
│   └── preload.ts      # IPC Bridge
├── src/                # Renderer Process (UI)
│   ├── _pages/         # React Views
│   ├── components/     # Reusable UI Components
│   └── types/          # Shared TypeScript Interfaces
├── resources/          # Static Assets (Icons, Entitlements)
└── docs/               # Documentation
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- Python 3 (for build tools)
- XCode Command Line Tools (macOS) or Visual Studio Build Tools (Windows)

### Installation
1. **Clone the repo**:
   ```bash
   git clone https://github.com/Lingikaushikreddy/Savvy-AI.git
   cd Savvy-AI
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment**:
   Create `.env`:
   ```env
   OPENAI_API_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   ```

### Running Locally
```bash
npm run app:dev
```
This runs Vite (Frontend) and Electron (Backend) concurrently with hot-reload.

---

## 📦 Building from Source

To create a distributable binary:
```bash
npm run package
```
Artifacts will be generated in `dist/`.

**Platform Specifics**:
- **macOS**: Requires signing identities for production builds. See [BUILD.md](./BUILD.md).
- **Windows**: Requires NSIS (handled by electron-builder).
- **Linux**: Generates AppImage.

---

## 🧪 Testing

Currently, manual testing is required for:
- Screen Capture (Visual check)
- Audio Capture (Verify transcript)
- Overlay behavior (Focus/Blur)

(Automated tests coming soon)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on Pull Requests and Code Style.

### Code Style
- We use **ESLint** and **Prettier**.
- Run linting: `npm run lint`

### Debugging
- Toggle **Debug Mode**: `Cmd/Ctrl + Shift + D`
- View Logs: `~/Library/Logs/Savvy AI/logs/`
