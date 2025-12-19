
import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'

interface CoachingTip {
    id: string
    type: 'pace' | 'volume' | 'filler' | 'emotion'
    message: string
    severity: 'info' | 'warning' | 'alert'
}

export const CoachingOverlay: React.FC = () => {
    const [isActive, setIsActive] = useState(false)
    const [volume, setVolume] = useState(-100)
    const [wpm, setWpm] = useState(0)
    const [tips, setTips] = useState<CoachingTip[]>([])
    const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral')

    // Use a ref to debounce updates slightly if needed, or accumulation

    useEffect(() => {
        // Listen for volume (high frequency)
        const removeVolumeListener = window.electron.ipcRenderer.on('coaching:volume', (_, vol) => {
            setVolume(vol)
        })

        // Listen for tips/metrics (lower frequency)
        const removeUpdateListener = window.electron.ipcRenderer.on('coaching:update', (_, data) => {
            setWpm(data.metrics.wpm || 0)
            setSentiment(data.metrics.sentiment || 'neutral')
            setTips(data.tips || [])

            // Auto-hide tips after 5 seconds? Handled by visual key/AnimatePresence
        })

        // Status
        const removeStatusListener = window.electron.ipcRenderer.on('coaching:status', (_, status) => {
            setIsActive(status.isActive)
        })

        return () => {
            removeVolumeListener()
            removeUpdateListener()
            removeStatusListener()
        }
    }, [])

    if (!isActive) return null

    return (
        <div className="fixed bottom-20 right-8 w-64 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl p-4 shadow-2xl z-50 pointer-events-none select-none">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Voice Coach</h3>
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Pace */}
                <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-sm text-gray-400">Pace</div>
                    <div className={`text-xl font-bold ${wpm > 160 ? 'text-red-400' : wpm < 110 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {wpm} <span className="text-xs font-normal">wpm</span>
                    </div>
                </div>

                {/* Sentiment */}
                <div className="bg-gray-800 rounded p-2 text-center">
                    <div className="text-sm text-gray-400">Tone</div>
                    <div className="text-xl">
                        {sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😟' : '😐'}
                    </div>
                </div>
            </div>

            {/* Volume Meter */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Vol</span>
                    <span>{Math.round(volume + 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, (volume + 60) * 2.5))}%` }} // Map -60..-20dB to 0..100%
                        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                    />
                </div>
            </div>

            {/* Tips / Feedback */}
            <div className="space-y-2 h-24 overflow-y-auto">
                <AnimatePresence>
                    {tips.map((tip) => (
                        <motion.div
                            key={tip.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`text-sm py-1 px-2 rounded border-l-2 ${tip.severity === 'alert' ? 'bg-red-500/10 border-red-500 text-red-200' :
                                    tip.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-200' :
                                        'bg-blue-500/10 border-blue-500 text-blue-200'
                                }`}
                        >
                            {tip.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
                {tips.length === 0 && (
                    <div className="text-xs text-gray-600 text-center py-4 italic">
                        Speaking comfortably...
                    </div>
                )}
            </div>
        </div>
    )
}
