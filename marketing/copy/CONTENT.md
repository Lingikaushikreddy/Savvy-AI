# Content Marketing Assets

## 📝 Blog Post
**Title**: Introducing Savvy AI: Your Invisible Meeting Co-Pilot
**Date**: December 17, 2024
**Author**: Kaushik

---

### The "Undetectable" Problem
We live in two worlds. The world of our focused work—coding, writing, designing—and the world of interruption—Endless Zoom calls, Slack pings, and context switching.

When you're deep in code and an error pops up, what do you do?
1. Copy the error.
2. Alt-Tab to Chrome.
3. Open ChatGPT.
4. Paste.
5. Wait.
6. Alt-Tab back.

It breaks your flow.

### Enter Savvy AI
We built Savvy AI to be **invisible**. It's a native layer over your OS.

**How it works**
When you hit `Cmd+Shift+H`, Savvy takes a high-performance screenshot of your current window. It uses native OCR and GPT-4o Vision to understand *exactly* what you're looking at.

If you're in a meeting, Savvy activates its "ears." It listens to the audio stream, runs a local Voice Activity Detection (VAD) filter to ignore silence, and transcribes conversation in real-time.

### Technical Deep Dive
For the engineers reading this:
- **Stack**: Electron + React + SQLite.
- **Vision**: We resize captures to 720p and compress to JPEG (Quality 60) locally before API transmission to ensure <1s latency.
- **Audio**: We use a rolling PCM buffer @ 16kHz for instant Whisper transcription.
- **Privacy**: Your API keys live in your local encrypted SQLite DB. We don't see your data.

### The Future
We're working on "Active Action" – where Savvy can not just tell you the answer, but type it for you. Stay tuned.

---

## 📧 Email Templates

### 1. Welcome Email (Onboarding)
**Subject**: Welcome to the future of work 🚀

Hi {{name}},

Thanks for downloading **Savvy AI**. You're now part of the "Augmented Workforce."

**3 Steps to get started:**
1. **Set your API Key**: Go to Settings to enable the brain.
2. **Try Vision**: Open a complex spreadsheet or code file and hit `Cmd+Shift+H`. Ask "What is this?"
3. **Try Audio**: Join a test Zoom call and toggle the mic (`Cmd+Shift+M`). Watch the transcript fly.

Need help? Reply to this email directly. I read every one.

Best,
Kaushik

### 2. Feedback Request (Day 3)
**Subject**: One quick question...

Hi {{name}},

You've been using Savvy for a few days now.

If you could wave a magic wand and add **one feature** to Savvy AI, what would it be?

1. Calendar Integration?
2. Local LLM support (Llama 3)?
3. Mobile app?

Hit reply and let me know.

Best,
Kaushik
