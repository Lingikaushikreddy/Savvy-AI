import mic from 'mic'
import { Writable } from 'stream'
import { EventEmitter } from 'events'

export interface AudioOptions {
  sampleRate: number
  channels: number
  format: 'wav' | 'mp3' | 'webm' // mic output is typically raw, but we can stream to format
  echoCancellation: boolean
  noiseSuppression: boolean
}

export interface AudioBufferChunk {
  data: Buffer
  duration: number
  timestamp: number
}

export class AudioCaptureManager extends EventEmitter {
  private micInstance: any
  private micInputStream: any
  public isCapturing: boolean = false
  private audioBuffer: Buffer[] = []
  private readonly MAX_BUFFER_SIZE_SECONDS = 30
  private readonly SAMPLE_RATE = 16000
  private options: AudioOptions

  // Rolling buffer management
  private rollingBuffer: Buffer = Buffer.alloc(0)

  constructor() {
    super()
    this.options = {
      sampleRate: 16000,
      channels: 1,
      format: 'wav',
      echoCancellation: true,
      noiseSuppression: true
    }
  }

  public async startCapture(options?: Partial<AudioOptions>): Promise<void> {
    if (this.isCapturing) return

    this.options = { ...this.options, ...options }

    try {
      // Configuration for 'mic' package to get 16kHz mono (Whisper compatible)
      this.micInstance = mic({
        rate: this.options.sampleRate.toString(),
        channels: this.options.channels.toString(),
        debug: false,
        exitOnSilence: 0
      })

      this.micInputStream = this.micInstance.getAudioStream()

      this.micInputStream.on('data', (data: Buffer) => {
        this.addToRollingBuffer(data)
        // Level meter calculation (RMS)
        this.calculateLevel(data)
      })

      this.micInputStream.on('error', (err: any) => {
        console.error('Microphone stream error:', err)
        this.emit('error', err)
      })

      this.micInstance.start()
      this.isCapturing = true
      console.log('Audio capture started')
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }

  public stopCapture(): void {
    if (!this.isCapturing || !this.micInstance) return

    this.micInstance.stop()
    this.isCapturing = false
    this.rollingBuffer = Buffer.alloc(0) // Clear buffer or persist?
    console.log('Audio capture stopped')
  }

  public async getAudioChunk(): Promise<AudioBufferChunk> {
    // Return the current buffered audio
    // Implementation: Copy buffer and return
    const chunk = Buffer.from(this.rollingBuffer)
    const duration = chunk.length / (this.options.sampleRate * 2) // 16bit = 2 bytes per sample

    return {
      data: chunk,
      duration,
      timestamp: Date.now()
    }
  }

  public isSpeaking: boolean = false
  private silenceThreshold: number = 500 // RMS threshold

  // ...

  public getCurrentLevel(): number {
    return this.currentLevel
  }

  private currentLevel: number = 0

  private calculateLevel(buffer: Buffer) {
    // Calculate RMS volume
    let sum = 0
    // 16-bit samples
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i)
      sum += sample * sample
    }
    const rms = Math.sqrt(sum / (buffer.length / 2))
    this.currentLevel = rms

    // Simple VAD
    this.isSpeaking = rms > this.silenceThreshold
  }

  private addToRollingBuffer(data: Buffer) {
    // Append data
    this.rollingBuffer = Buffer.concat([this.rollingBuffer, data])

    // Maintain max duration (30s)
    // 16kHz * 16bit(2bytes) * 1channel = 32000 bytes per second
    const bytesPerSecond = this.options.sampleRate * 2
    const maxBytes = bytesPerSecond * this.MAX_BUFFER_SIZE_SECONDS

    if (this.rollingBuffer.length > maxBytes) {
      // Optimize: Slice buffer to maintain size without growing indefinitely
      const overflow = this.rollingBuffer.length - maxBytes
      this.rollingBuffer = this.rollingBuffer.subarray(overflow)
    }
  }
}
