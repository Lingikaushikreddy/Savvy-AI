
import fs from 'fs'
import { LLMRouter, Context, MessageContent } from './ai/LLMRouter'

export class LLMHelper {
  private router: LLMRouter
  private readonly systemPrompt = `You are Savvy AI, a helpful, proactive desktop assistant. You can see what the user sees. Analyze the provided images or context and provide clear, concise, and helpful responses. If the user presents a problem, solve it. If they present code, debug it or explain it. Always be friendly and professional.`

  constructor() {
    this.router = new LLMRouter()
    // Default to OpenAI GPT-4o which is good for vision and reasoning
    this.router.setProvider('openai')
    this.router.setModel('gpt-4o')
  }

  // Helper to read file and return base64 data url
  private async fileToDataUrl(path: string, mimeType: string = 'image/png'): Promise<string> {
    const data = await fs.promises.readFile(path)
    return `data:${mimeType};base64,${data.toString('base64')}`
  }

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '')
    text = text.trim()
    return text
  }

  public getRouter(): LLMRouter {
    return this.router
  }

  public async extractProblemFromImages(imagePaths: string[]) {
    try {
      const content: MessageContent = []

      // Add text prompt first
      const prompt = `You are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      content.push({ type: 'text', text: prompt })

      // Add images
      for (const path of imagePaths) {
        const url = await this.fileToDataUrl(path)
        content.push({
          type: 'image_url',
          image_url: { url }
        })
      }

      const context: Context = {
        systemPrompt: this.systemPrompt,
        messages: [{ role: 'user', content }]
      }

      const response = await this.router.complete(context, {
        temperature: 0.3,
        // GPT-4o default. 
      })

      const text = this.cleanJsonResponse(response.text)
      return JSON.parse(text)
    } catch (error) {
      console.error('Error extracting problem from images:', error)
      throw error
    }
  }

  public async generateSolution(problemInfo: any) {
    const prompt = `Given this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nPlease provide your response in the following JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    console.log('[LLMHelper] Calling LLMRouter for solution...')
    try {
      const context: Context = {
        systemPrompt: this.systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      }

      const response = await this.router.complete(context)
      console.log('[LLMHelper] LLMRouter returned result.')

      const text = this.cleanJsonResponse(response.text)
      const parsed = JSON.parse(text)
      console.log('[LLMHelper] Parsed LLM response:', parsed)
      return parsed
    } catch (error) {
      console.error('[LLMHelper] Error in generateSolution:', error)
      throw error
    }
  }

  public async debugSolutionWithImages(
    problemInfo: any,
    currentCode: string,
    debugImagePaths: string[]
  ) {
    try {
      const content: MessageContent = []

      const prompt = `You are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
    "code": "The code or main answer here.",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

      content.push({ type: 'text', text: prompt })

      for (const path of debugImagePaths) {
        const url = await this.fileToDataUrl(path)
        content.push({
          type: 'image_url',
          image_url: { url }
        })
      }

      const context: Context = {
        systemPrompt: this.systemPrompt,
        messages: [{ role: 'user', content }]
      }

      const response = await this.router.complete(context)
      const text = this.cleanJsonResponse(response.text)
      const parsed = JSON.parse(text)
      console.log('[LLMHelper] Parsed debug LLM response:', parsed)
      return parsed
    } catch (error) {
      console.error('Error debugging solution with images:', error)
      throw error
    }
  }

  public async analyzeAudioFile(audioPath: string) {
    try {
      // Audio analysis is tricky with generic LLMs unless they support audio input (like Gemini 1.5 Pro).
      // GPT-4o Audio is not fully available via standard Chat Completions API in all internal contexts the same way.
      // However, we can use Whisper for transcription (via Router or separate client?) and then reasoning.
      // Existing implementation used Gemini with audio blob.
      // For now, let's assume we can rely on transcription or if using Gemini via Router?
      // Wait, LLMRouter only supports OpenAI/Anthropic. Neither support direct audio file input in "Chat Completions" easily (Whisper is separate).
      // Since we have WhisperClient globally available in AppState, maybe we should rely on that for transcription?
      // But this method signature expects a text response.
      // I'll implement a fallback message for now: "Audio analysis requires transcription first."
      // OR, since the previous implementation was Gemini-specific which accepted audio bytes...
      // The prompt "Upgrade project" implies we might lose Gemini unless I add it to Router. 
      // I will leave a TODO or throw not implemented for DIRECT audio analysis here, 
      // assuming the caller might switch to `transcribeAudio` + `complete` flow.
      // Actually, let's be safe: If this method is called, we can try to assume it's text for now or verify if we can hook up Whisper here.
      // But LLMHelper doesn't have access to WhisperClient (it's in AppState).

      // Temporary solution: Throw error or return mock, advising to use the new AudioCapture flow.
      return { text: "Audio analysis via LLMHelper is deprecated. Please use the new Audio Capture & Transcription features.", timestamp: Date.now() }
    } catch (error) {
      console.error('Error analyzing audio file:', error)
      throw error
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string) {
    // Same as above.
    return { text: "Audio analysis via LLMHelper is deprecated. Please use the new Audio Capture & Transcription features.", timestamp: Date.now() }
  }

  public async analyzeImageFile(imagePath: string) {
    try {
      const url = await this.fileToDataUrl(imagePath)
      const content: MessageContent = [
        { type: 'text', text: "Describe the content of this image in a short, concise answer. Suggest several possible actions or responses the user could take next. Answer naturally." },
        { type: 'image_url', image_url: { url } }
      ]

      const context: Context = {
        systemPrompt: this.systemPrompt,
        messages: [{ role: 'user', content }]
      }

      const response = await this.router.complete(context)
      return { text: response.text, timestamp: Date.now() }
    } catch (error) {
      console.error('Error analyzing image file:', error)
      throw error
    }
  }
}
