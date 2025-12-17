
import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const MicrophoneIndicator: React.FC = () => {
    const { status, audioLevel } = useAppStore()
    const isListening = status === 'listening'

    // Waveform bars configuration
    const bars = 5

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-sm">
            {isListening ? (
                <Mic className="w-3.5 h-3.5 text-blue-400" />
            ) : (
                <MicOff className="w-3.5 h-3.5 text-gray-500" />
            )}

            <div className="flex items-center gap-0.5 h-4">
                {Array.from({ length: bars }).map((_, i) => {
                    // Calculate height based on audio level and index for a wave effect
                    // This is a pseudo-visualization if audioLevel is a single number 0-100
                    const heightMultiplier = isListening ? Math.max(0.2, Math.min(1, audioLevel / 50)) : 0.1

                    return (
                        <motion.div
                            key={i}
                            className={`w-1 rounded-full ${isListening ? 'bg-blue-500' : 'bg-gray-600'}`}
                            animate={{
                                height: isListening
                                    ? [4, 4 + (Math.random() * 12 * heightMultiplier), 4]
                                    : 4
                            }}
                            transition={{
                                duration: 0.2,
                                repeat: Infinity,
                                repeatType: 'reverse',
                                delay: i * 0.05
                            }}
                        />
                    )
                })}
            </div>

            <div className="text-xs font-mono text-gray-400 min-w-[30px] text-right">
                {isListening ? `${Math.round(audioLevel)}%` : 'OFF'}
            </div>
        </div>
    )
}
