import React, { useEffect, useRef, useState } from 'react'
import { Message } from '../types/chat'
import { MessageItem } from '../components/chat/MessageItem'
import { Send, Image as ImageIcon, X, Settings, Minus } from 'lucide-react'

interface ChatProps {
  messages: Message[]
  onSendMessage: (text: string) => void
  onCaptureScreenshot: () => void
  isTyping: boolean
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, onCaptureScreenshot, isTyping }) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-[600px] w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl text-white font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 draggable">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold tracking-wide text-sm">Savvy AI</span>
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white">
            <Minus size={14} />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white">
            <Settings size={14} />
          </button>
          <button
            className="p-1.5 hover:bg-red-500/80 rounded-md transition-colors text-gray-400 hover:text-white"
            onClick={() => window.electronAPI.quitApp()}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none border border-white/5">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative flex items-center gap-2">
          <button
            onClick={onCaptureScreenshot}
            className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors"
            title="Snipping Tool"
          >
            <ImageIcon size={20} />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Savvy..."
            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder-gray-500 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white rounded-xl transition-all shadow-lg shadow-cyan-900/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat
