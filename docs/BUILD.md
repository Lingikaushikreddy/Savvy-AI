# Build and Distribution Guide

This guide covers how to build, package, and troubleshoot Savvy AI for macOS, Windows, and Linux.

## Prerequisites

- **Node.js 20+**
- **npm** or **pnpm**
- **Git**

## Quick Start (All Platforms)

To build for your current operating system:
```bash
npm install
npm run package
```
Artifacts will be in the `dist/` folder.

## Platform-Specific Instructions

### 🍎 macOS
**Requirements**: macOS 11+
**Command**: `npm run build:mac`

**Signing & Notarization**:
To distribute to other users, you must sign and notarize the app.
1. Export `CSC_LINK` (path to .p12 cert) and `CSC_KEY_PASSWORD` env vars.
2. Export `APPLE_ID`, `APPLE_ID_PASSWORD`, and `APPLE_TEAM_ID`.
3. `electron-builder` handles the rest automatically.

**Entitlements**:
Review `resources/entitlements.mac.plist`. We request:
- Camera (Screen Capture)
- Microphone (Audio)
- JIT/Unsigned Memory (Performance)

### 🪟 Windows
**Requirements**: Windows 10/11
**Command**: `npm run build:win`

**Signing**:
1. Obtain a code signing certificate (PFX).
2. Export `CSC_LINK` and `CSC_KEY_PASSWORD`.

### 🐧 Linux
**Requirements**: Ubuntu 20.04+ (or equivalent)
**Dependencies**: `libarchive-tools`, `graphicsmagick`
**Command**: `npm run build:linux`

## CI/CD Pipeline
We use **GitHub Actions** (`.github/workflows/build.yml`) to build automatically on tag push (`v*`).
1. Tag a release: `git tag v1.0.0`
2. Push tag: `git push origin v1.0.0`
3. Check "Actions" tab in GitHub. Artifacts will be attached to a new Release.

## Troubleshooting

### Build Fails on Native Deps?
- Delete `node_modules` and `dist`.
- Run `npm install`.
- Ensure python and C++ build tools are installed.

### "App is damaged" on macOS?
- This means the app is not signed/notarized.
- Run `xattr -cr /Applications/Savvy\ AI.app` to bypass Gatekeeper locally.

### Icons missing?
- Ensure `resources/icon.icns` (Mac), `resources/icon.ico` (Win), and `resources/icon.png` (Linux) exist.
- Use a tool like [ImageMagick](https://imagemagick.org) to generate icons from a master PNG.

### Permission Errors?
- Verify `resources/entitlements.mac.plist` is correct.
- On macOS, open System Preferences -> Security & Privacy to manually grant Screen Recording permission if dev build fails to prompt.
