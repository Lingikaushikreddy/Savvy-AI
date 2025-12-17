
import { AppState } from '../main'
import { Context, MessageContent } from './LLMRouter'
import { clipboard } from 'electron'

export class ContextBuilder {
    private appState: AppState

    constructor(appState: AppState) {
        this.appState = appState
    }

    async buildContext(): Promise<Context> {
        const messages: { role: 'user' | 'assistant' | 'system', content: MessageContent }[] = []

        // 1. Get Screenshot (Visual Context)
        let screenshotUrl: string | undefined
        try {
            // We use a simplified screenshot getter here. 
            // In a real scenario we might want to cache or reuse the last capture.
            const screenshotPath = await this.appState.takeScreenshot()
            const preview = await this.appState.getImagePreview(screenshotPath)
            screenshotUrl = preview
            // Cleanup file if needed, or let appState manage it
        } catch (e) {
            console.error('Failed to capture screenshot for context:', e)
        }

        // 2. Get Clipboard (Text Context)
        const clipboardText = clipboard.readText()

        // 3. Construct Message Content
        const contentParts: any[] = []

        if (clipboardText) {
            contentParts.push({ type: 'text', text: `Clipboard Content:\n${clipboardText}\n` })
        }

        if (screenshotUrl) {
            contentParts.push({ type: 'image_url', image_url: { url: screenshotUrl } })
        }

        // Add instruction
        contentParts.push({ type: 'text', text: "Please analyze the context provided (screenshot/clipboard) and answer the user's query." })

        return {
            systemPrompt: "You are Savvy AI, an intelligent desktop assistant. Use the provided screenshot and clipboard context to answer user questions helpfully.",
            messages: [
                { role: 'user', content: contentParts }
            ]
        }
    }
}
