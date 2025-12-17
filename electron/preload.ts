
import { contextBridge, ipcRenderer } from 'electron'

// --- Secure API Exposure ---
contextBridge.exposeInMainWorld('api', {
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),
    toggle: () => ipcRenderer.invoke('window:toggle'),
    move: (x: number, y: number) => ipcRenderer.invoke('window:move', x, y),
    resize: (w: number, h: number) => ipcRenderer.invoke('window:resize', w, h),
  },

  capture: {
    start: () => ipcRenderer.invoke('capture:start'),
    stop: () => ipcRenderer.invoke('capture:stop'),
    getStatus: () => ipcRenderer.invoke('capture:status'),
    requestPermissions: () => ipcRenderer.invoke('capture:request-permissions'),
  },

  ai: {
    query: (question: string) => ipcRenderer.invoke('ai:query', question),
    stream: (question: string, onChunk: (chunk: string) => void, onEnd: () => void) => {
      const handleChunk = (_: any, chunk: string) => onChunk(chunk)
      const handleEnd = () => {
        ipcRenderer.removeListener('ai:stream-chunk', handleChunk)
        ipcRenderer.removeListener('ai:stream-end', handleEnd)
        onEnd()
      }
      ipcRenderer.on('ai:stream-chunk', handleChunk)
      ipcRenderer.on('ai:stream-end', handleEnd)
      ipcRenderer.send('ai:stream', question)
    },
    stop: () => ipcRenderer.invoke('ai:stop'),
    clearContext: () => ipcRenderer.invoke('ai:clear-context'),
    analyzeContext: (transcript: string, screenText: string) => ipcRenderer.invoke('context:analyze', transcript, screenText),
  },

  conversation: {
    create: (data: any) => ipcRenderer.invoke('conversation:create', data),
    get: (id: string) => ipcRenderer.invoke('conversation:get', id),
    list: (filters: any) => ipcRenderer.invoke('conversation:list', filters),
    delete: (id: string) => ipcRenderer.invoke('conversation:delete', id),
    export: (id: string) => ipcRenderer.invoke('conversation:export', id),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    validateApiKey: (provider: string, key: string) => ipcRenderer.invoke('settings:validate-api-key', provider, key),
  },

  shortcuts: {
    getAll: () => ipcRenderer.invoke('shortcuts:get-all'),
    update: (action: string, key: string) => ipcRenderer.invoke('shortcuts:update', action, key),
    reset: () => ipcRenderer.invoke('shortcuts:reset'),
  },
})

// Keep legacy API for backward compatibility during migration
// Note: We are mocking the old structure to point to new or legacy handlers where appropriate
contextBridge.exposeInMainWorld('electron', {
  transcribeAudio: (buffer: ArrayBuffer) => ipcRenderer.invoke('transcribe-audio', buffer),
  createConversation: (data: any) => ipcRenderer.invoke('db-create-conversation', data),
  listConversations: (filters: any) => ipcRenderer.invoke('db-list-conversations', filters),
  getConversation: (id: string) => ipcRenderer.invoke('db-get-conversation', id),
  deleteConversation: (id: string) => ipcRenderer.invoke('db-delete-conversation', id),
  addMessage: (conversationId: string, message: any) => ipcRenderer.invoke('db-add-message', conversationId, message),
  getMessages: (conversationId: string, limit?: number) => ipcRenderer.invoke('db-get-messages', conversationId, limit),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('db-save-setting', key, value),
  getSetting: (key: string) => ipcRenderer.invoke('db-get-setting', key),
  getAllSettings: () => ipcRenderer.invoke('db-get-all-settings'),
  startScreenCapture: (interval: number) => ipcRenderer.invoke('screen-capture-start', interval),
  stopScreenCapture: () => ipcRenderer.invoke('screen-capture-stop'),
  captureScreenOnce: () => ipcRenderer.invoke('screen-capture-once'),

  // Legacy Window controls
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  toggleWindow: () => ipcRenderer.invoke('window:toggle'),
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke('window:resize', dimensions.width, dimensions.height),

  // Legacy Screen Capture
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  deleteScreenshot: (path: string) => ipcRenderer.invoke('delete-screenshot', path),
  recognizeText: (path: string) => ipcRenderer.invoke('recognize-text', path),
  recognizeTextAdvanced: (image: string) => ipcRenderer.invoke('recognize-text-advanced', image),

  // Legacy Audio
  startAudioCapture: () => ipcRenderer.invoke('audio-start'), // These might need to be re-mapped to new capture:start? 
  // keeping separate if handlers exist
  stopAudioCapture: () => ipcRenderer.invoke('audio-stop'),
  getAudioChunk: () => ipcRenderer.invoke('audio-get-chunk'),
  getAudioLevel: () => ipcRenderer.invoke('audio-get-level'),
})
