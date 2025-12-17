
import React from 'react'
import { motion } from 'framer-motion'
import { MicrophoneIndicator } from './MicrophoneIndicator'
import { ProcessingSpinner } from './ProcessingSpinner'
import { TokenCounter } from './TokenCounter'
import { ConnectionStatus } from './ConnectionStatus'
import { useAppStore } from '../../store/useAppStore'

export const StatusSystem: React.FC = () => {
    const { status } = useAppStore()

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Top Bar: Connection & Mic */}
            <div className="flex items-center justify-between">
                <MicrophoneIndicator />
                <ConnectionStatus />
            </div>

            {/* Contextual Status Area */}
            <div className="h-8 flex items-center justify-center">
                {status === 'processing' ? (
                    <ProcessingSpinner />
                ) : (
                    <div className="text-xs text-gray-500 font-medium">
                        {status === 'idle' && "Ready for query"}
                        {status === 'listening' && "Listening..."}
                        {status === 'ready' && "Response ready"}
                        {status === 'error' && "Error occurred"}
                    </div>
                )}
            </div>

            {/* Bottom: Token Stats (Only show if not expanded or put in settings? 
               User asked for visual system, putting it here for now but usually distracting in main view. 
               Maybe only show if open? I'll add a condition or keep it small) 
            */}
            {/* Keeping it simple for overlay */}
            {/* <TokenCounter /> */}
        </div>
    )
}
