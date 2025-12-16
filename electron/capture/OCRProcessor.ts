import { createWorker, Worker } from 'tesseract.js'

export type ContextType = 'CODE_EDITOR' | 'BROWSER' | 'TERMINAL' | 'PRESENTATION' | 'GENERAL'

export interface TextRegion {
  text: string
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
  confidence: number
}

export interface OCRResult {
  text: string
  confidence: number
  regions: TextRegion[]
  detectedContext: ContextType
}

export class OCRProcessor {
  private worker: Worker | null = null
  private isInitializing: boolean = false
  private initPromise: Promise<void> | null = null

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.worker) return
    if (this.isInitializing && this.initPromise) {
      return this.initPromise
    }

    this.isInitializing = true

    this.initPromise = (async () => {
      try {
        this.worker = await createWorker('eng')
      } catch (error) {
        console.error('Failed to initialize OCR worker:', error)
        this.worker = null
      } finally {
        this.isInitializing = false
        this.initPromise = null
      }
    })()

    return this.initPromise
  }

  public async extractText(image: string): Promise<OCRResult> {
    if (!this.worker) {
      await this.initialize()
    }

    if (!this.worker) {
      throw new Error('OCR Worker not initialized')
    }

    try {
      const { data } = await this.worker.recognize(image)

      const regions: TextRegion[] = data.lines.map((line: any) => ({
        text: line.text.trim(),
        bbox: {
          x0: line.bbox.x0,
          y0: line.bbox.y0,
          x1: line.bbox.x1,
          y1: line.bbox.y1
        },
        confidence: line.confidence
      }))

      const confidence = data.confidence
      const text = data.text
      const detectedContext = this.detectContext(text)

      return {
        text,
        confidence,
        regions,
        detectedContext
      }
    } catch (error) {
      console.error('OCR Extraction Failed:', error)
      throw error
    }
  }

  public detectContext(text: string): ContextType {
    const lines = text.split('\n')
    let codeScore = 0
    let browserScore = 0
    let terminalScore = 0
    let presentationScore = 0

    const patterns = {
      code: [
        /const\s|let\s|var\s/,
        /function\s|class\s|=>/,
        /import\s.*from/,
        /return\s/,
        /if\s*\(|for\s*\(|while\s*\(/,
        /console\.log|print\(/,
        /\{|\}|\[|\]/ // Brackets usually imply code/json
      ],
      browser: [
        /http:\/\//,
        /https:\/\//,
        /www\./,
        /\.com|\.org|\.net|\.io/,
        /Search\sor\stype\sURL/,
        /Back|Forward|Reload|Home/
      ],
      terminal: [
        /^\$\s/,
        /^>\s/,
        /cd\s|ls\s|pwd|git\s/,
        /npm\s|yarn\s|pnpm\s/,
        /docker\s/,
        /Error:|Warning:|Exception:/
      ],
      presentation: [
        /^Slide\s\d/,
        /Page\s\d+\sof\s\d+/,
        / Agenda | Overview | Summary /,
        /•\s|–\s/ // Bullets
      ]
    }

    // Heuristic scoring
    for (const line of lines) {
      if (patterns.code.some((p) => p.test(line))) codeScore++
      if (patterns.browser.some((p) => p.test(line))) browserScore++
      if (patterns.terminal.some((p) => p.test(line))) terminalScore++
      if (patterns.presentation.some((p) => p.test(line))) presentationScore++
    }

    // specific boosters
    if (text.includes('TypeError') || text.includes('ReferenceError')) codeScore += 2
    if (text.includes('404 Not Found')) browserScore += 2

    const maxScore = Math.max(codeScore, browserScore, terminalScore, presentationScore)

    if (maxScore === 0) return 'GENERAL'

    if (maxScore === codeScore) return 'CODE_EDITOR'
    if (maxScore === terminalScore) return 'TERMINAL'
    if (maxScore === browserScore) return 'BROWSER'
    if (maxScore === presentationScore) return 'PRESENTATION'

    return 'GENERAL'
  }

  public async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}
