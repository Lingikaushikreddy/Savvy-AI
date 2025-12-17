# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-17

### Added
- **Meeting Notes Generator**: Automatically summarizes meetings, extracts action items, and drafts follow-up emails.
- **Robust Error Handling**: Comprehensive system for retries, fallbacks (Audio/Local STT), and crash recovery.
- **Logging System**: Rotating file logs (`~/Library/Logs/Savvy AI`) with JSON structure and Debug toggle.
- **Build System**: Cross-platform build configuration (Mac/Win/Linux) via `electron-builder`.
- **Performance**:
  - Screen Capture: 720p optimization + JPEG compression.
  - Audio: Voice Activity Detection (VAD).
  - LLM: In-memory response caching.

### Changed
- **Shortcuts**: Updated global shortcuts to be customizable via Settings.
- **Authentication**: now supports both OpenAI and Anthropic API keys securely.
- **UI**: Optimized Chat rendering with virtualization/memoization.

### Security
- **Entitlements**: Hardened runtime with specific macOS entitlements (Camera/Mic/JIT).

---
## [0.9.0] - 2024-12-01
### Initial Beta Release
- Basic Contextual Screen Analysis.
- Real-time Transcription.
- Overlay UI.
