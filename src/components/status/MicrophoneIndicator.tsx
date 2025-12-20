
import React from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const MicrophoneIndicator: React.FC = () => {
    const { isListening, audioLevel } = useAppStore()

    // Generate random bars for visualization
    const bars = 5
    const heightMultiplier = 3

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 backdrop-blur-sm shadow-lg shadow-purple-900/20">
            {isListening ? (
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 blur-sm opacity-50 animate-pulse rounded-full" />
                    <Mic className="w-3.5 h-3.5 text-red-400 relative z-10" />
                </div>
            ) : (
                <MicOff className="w-3.5 h-3.5 text-gray-500" />
            )}

            <div className="flex items-center gap-0.5 h-4 w-12 justify-center">
                {[...Array(bars)].map((_, i) => (
                    <motion.div
                        key={i}
                        className={`w-1 rounded-full ${isListening ? 'bg-gradient-to-t from-purple-500 to-pink-500' : 'bg-gray-700'}`}
                        animate={{
                            height: isListening
                                ? [4, 4 + (Math.random() * 10 * (audioLevel / 50)), 4]
                                : 4,
                            opacity: isListening ? 1 : 0.5
                        }}
                        transition={{
                            duration: 0.2,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: i * 0.05
                        }}
                    />
                ))}
            </div>

            <div className="text-[10px] font-mono font-bold text-purple-300 min-w-[24px] text-right">
                {isListening ? `${Math.round(audioLevel)}` : ''}
            </div>
        </div>
    )
}
