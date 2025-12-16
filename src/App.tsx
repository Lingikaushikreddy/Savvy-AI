import React, { useEffect } from 'react'
import { OverlayPanel } from './components/overlay/OverlayPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { Toaster } from './components/ui/toast'
import { useAppStore } from './store/useAppStore'

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

const App: React.FC = () => {
  const {
    toggleVisibility,
    toggleExpanded,
    clearData,
    triggerAI
  } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Visibility: Cmd+Ctrl+B (Example)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        toggleVisibility()
      }
      // Toggle Expand: Cmd+Ctrl+H
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        toggleExpanded()
      }

      // Clear: Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        clearData()
      }

      // Trigger AI: Cmd+Enter (Often conflicting, lets use Cmd+Shift+A as requested)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        triggerAI()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleVisibility, toggleExpanded, clearData, triggerAI])

  return (
    <div className="w-screen h-screen bg-transparent font-inter selection:bg-blue-500/30">
      {/* The main overlay panel */}
      <OverlayPanel />

      {/* Settings Modal */}
      <SettingsPanel />

      {/* Toasts and other global fixed elements */}
      <Toaster />
    </div>
  )
}

export default App
