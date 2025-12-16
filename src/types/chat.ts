export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: 'text' | 'image' | 'code'
  timestamp: number
  metadata?: any
}

export interface ChatState {
  messages: Message[]
  isTyping: boolean
}
