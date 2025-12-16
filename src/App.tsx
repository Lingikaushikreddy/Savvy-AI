import { ToastProvider } from './components/ui/toast'
import { ToastViewport } from '@radix-ui/react-toast'
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import Chat from './_pages/Chat'
import { Message } from './types/chat'
import { v4 as uuidv4 } from 'uuid'

declare global {
  interface Window {
    electronAPI: {
      updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>
      onUnauthorized: (callback: () => void) => () => void
      onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      onResetView: (callback: () => void) => () => void
      takeScreenshot: () => Promise<void>
      deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>
      onSolutionStart: (callback: () => void) => () => void
      onSolutionError: (callback: (error: string) => void) => () => void
      onSolutionSuccess: (callback: (data: any) => void) => () => void
      onProblemExtracted: (callback: (data: any) => void) => () => void
      onDebugSuccess: (callback: (data: any) => void) => () => void
      onDebugStart: (callback: () => void) => () => void
      onDebugError: (callback: (error: string) => void) => () => void
      analyzeAudioFromBase64: (
        data: string,
        mimeType: string
      ) => Promise<{ text: string; timestamp: number }>
      analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>
      moveWindowLeft: () => Promise<void>
      moveWindowRight: () => Promise<void>
      quitApp: () => Promise<void>
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => Promise<void>
      onClipboardTextChanged: (callback: (text: string) => void) => () => void
      onClipboardImageChanged: (callback: (dataUrl: string) => void) => () => void
      startScreenCapture: (interval?: number) => Promise<void>
      stopScreenCapture: () => Promise<void>
      captureScreenOnce: () => Promise<any>
      recognizeTextAdvanced: (image: string) => Promise<any>
      startAudioCapture: () => Promise<void>
      stopAudioCapture: () => Promise<void>
      getAudioChunk: () => Promise<any>
      getAudioLevel: () => Promise<number>
      transcribeAudio: (audioBuffer: any) => Promise<any>
    }
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm Savvy. I can see what you see. Take a screenshot or ask me anything.",
      type: 'text',
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now()
    }
  ])
  const [isTyping, setIsTyping] = useState(false)

  // Load history
  useEffect(() => {
    const stored = localStorage.getItem('savvy_history')
    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse history', e)
      }
    }
  }, [])

  // Save history
  useEffect(() => {
    localStorage.setItem('savvy_history', JSON.stringify(messages))
  }, [messages])

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages((prev) => [...prev, { ...msg, id: uuidv4(), timestamp: Date.now() }])
  }

  useEffect(() => {
    // Listeners
    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(({ path, preview }) => {
        addMessage({
          role: 'user',
          content: '',
          type: 'image',
          metadata: { path, preview }
        })
        setIsTyping(true) // Assuming backend starts processing immediately?
        // Actually, onScreenshotTaken just means it's taken. Backend processing triggers separate events?
        // Existing logic: onSolutionStart -> setView('solutions').
        // So we should wait for onSolutionStart.
      }),
      window.electronAPI.onSolutionStart(() => {
        setIsTyping(true)
      }),
      window.electronAPI.onSolutionSuccess((data) => {
        setIsTyping(false)
        if (data?.solution) {
          const { code, thoughts } = data.solution
          const text = thoughts ? thoughts.join('\n') + '\n\n' + code : code
          addMessage({
            role: 'assistant',
            content: text || 'I found a solution!',
            type: 'code' // or text
          })
        }
      }),
      window.electronAPI.onSolutionError((error) => {
        setIsTyping(false)
        addMessage({
          role: 'system',
          content: `Error: ${error}`,
          type: 'text'
        })
      }),
      window.electronAPI.onProcessingNoScreenshots(() => {
        addMessage({
          role: 'system',
          content: 'No screenshots found to process.',
          type: 'text'
        })
        setIsTyping(false)
      }),
      window.electronAPI.onProblemExtracted((data) => {
        // This is called for the initial screenshot analysis
        setIsTyping(false)
        if (data?.problem_statement) {
          addMessage({
            role: 'assistant',
            content: data.problem_statement,
            type: 'text'
          })
        }
      }),
      window.electronAPI.onDebugSuccess((data) => {
        setIsTyping(false)
        if (data?.solution) {
          const { code, thoughts } = data.solution
          const text = thoughts ? thoughts.join('\n') + '\n\n' + code : code
          addMessage({
            role: 'assistant',
            content: text || 'Debug complete.',
            type: 'code'
          })
        }
      }),
      window.electronAPI.onClipboardTextChanged((text) => {
        addMessage({
          role: 'user',
          content: `(Clipboard) ${text}`,
          type: 'text'
        })
      }),
      window.electronAPI.onClipboardImageChanged((dataUrl) => {
        addMessage({
          role: 'user',
          content: '',
          type: 'image',
          metadata: { preview: dataUrl }
        })
      })
    ]

    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  const handleSendMessage = (text: string) => {
    addMessage({
      role: 'user',
      content: text,
      type: 'text'
    })
    // TODO: Send to backend if text chat is supported
    // For now, Savvy AI is primarily visual.
    // We might need to implement a text chat IPC handler if we want text interaction.
    // "Phase 6: Backend & AI Integration" will handle this.
    // For now, we just show it.
  }

  const handleCaptureScreenshot = () => {
    window.electronAPI.takeScreenshot()
  }

  return (
    <div className="h-screen w-screen bg-transparent overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            onCaptureScreenshot={handleCaptureScreenshot}
            isTyping={isTyping}
          />
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
