
import React, { memo } from 'react'
import { Message } from '../../types/chat'

interface MessageItemProps {
    message: Message
}

export const MessageItem = memo(({ message }: MessageItemProps) => {
    return (
        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${message.role === 'user'
                        ? 'bg-cyan-600/80 text-white rounded-br-none'
                        : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/5'
                    }`}
            >
                {message.type === 'image' ? (
                    <div className="space-y-2">
                        <span className="text-xs opacity-70 italic">Screenshot caught</span>
                        {message.metadata?.preview && (
                            <img
                                src={message.metadata.preview}
                                alt="Screenshot"
                                className="rounded-lg max-w-full"
                            />
                        )}
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                )}
            </div>
        </div>
    )
})

MessageItem.displayName = 'MessageItem'
