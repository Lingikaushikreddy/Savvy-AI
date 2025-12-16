import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { Readable } from 'stream'

export type WhisperModel = 'whisper-1' | 'whisper-large-v3'

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
  confidence: number
  speaker?: string
}

export interface SpeakerInfo {
  id: string
  label: 'Me' | 'Them' | 'Unknown'
  segments: number[]
}

export interface TranscriptResult {
  text: string
  language: string
  duration: number
  segments: TranscriptSegment[]
  speakers?: SpeakerInfo[]
}

export interface TranscriptChunk {
  text: string
  isFinal: boolean
}

export class WhisperClient {
  private client: AxiosInstance
  private apiKey: string
  private model: WhisperModel = 'whisper-1'
  private language: string = 'en'
  private maxRetries: number = 3

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    })
  }

  public setApiKey(key: string) {
    this.apiKey = key
    this.client.defaults.headers['Authorization'] = `Bearer ${key}`
  }

  public setModel(model: WhisperModel) {
    this.model = model
  }

  public setLanguage(language: string) {
    this.language = language
  }

  public async transcribe(audioBuffer: Buffer): Promise<TranscriptResult> {
    const formData = new FormData()
    formData.append('file', audioBuffer, { filename: 'audio.wav', contentType: 'audio/wav' })
    formData.append('model', this.model)
    formData.append('language', this.language)
    // Request verbose_json to get segments/timestamps
    formData.append('response_format', 'verbose_json')

    let retries = 0
    while (retries < this.maxRetries) {
      try {
        const response = await this.client.post('/audio/transcriptions', formData, {
          headers: {
            ...formData.getHeaders()
          }
        })

        return this.processResponse(response.data)
      } catch (error: any) {
        retries++
        console.error(
          `Whisper API transcription failed (Attempt ${retries}/${this.maxRetries}):`,
          error.message
        )

        if (retries >= this.maxRetries) {
          throw new Error(`Whisper API failed after ${this.maxRetries} attempts: ${error.message}`)
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)))
      }
    }

    throw new Error('Unexpected error in transcribe loop')
  }

  public async *transcribeStream(audioStream: Readable): AsyncGenerator<TranscriptChunk> {
    // OpenAI Whisper API does not support true streaming yet (Server Sent Events for partials).
    // This is a simulated stream that accumulates chunks or sends small batches.
    // For now, we will throw or implement a basic chunk-sender if using a different backend.
    // Given the prompt asks for "transcribeStream", we will implement a logic that
    // reads from the stream into a buffer and sends it when it reaches a certain size.

    // NOTE: Real-time streaming usually requires WebSockets to a service that supports it
    // (like Deepgram or OpenAI Realtime API). Standard Whisper API is REST.
    // We will simulate it by yielding the final result as a "Final Chunk".

    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk))
    }
    const fullBuffer = Buffer.concat(chunks)
    const result = await this.transcribe(fullBuffer)
    yield { text: result.text, isFinal: true }
  }

  private processResponse(data: any): TranscriptResult {
    // Map OpenAI verbose_json response to TranscriptResult

    // OpenAI segments format:
    // { id, seek, start, end, text, tokens, temperature, avg_logprob, compression_ratio, ... }

    const segments: TranscriptSegment[] = (data.segments || []).map((seg: any) => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: Math.exp(seg.avg_logprob || -1) // rough approximation from logprob
    }))

    // Diarization Logic (Stub/Heuristic)
    // OpenAI Whisper does not provide speakers. We will attempt a naive partition if requested
    // or just return undefined speakers for now as per prompt "Use voice fingerprinting IF AVAILABLE".
    // Since it's not available in standard API, we leave it undefined or mock it.

    const speakers: SpeakerInfo[] | undefined = undefined

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
      segments: segments,
      speakers: speakers
    }
  }

  // Experimental: Mock Diarization based on text patterns or turn-taking pauses
  private estimateSpeakers(segments: TranscriptSegment[]): SpeakerInfo[] {
    // Very naive implementation
    return [
      {
        id: 'speaker_0',
        label: 'Unknown',
        segments: segments.map((s) => s.id)
      }
    ]
  }
}
