
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const ProcessingSpinner: React.FC = () => {
    const { status, setStatus } = useAppStore()

    if (status !== 'processing') return null

    const handleCancel = () => {
        setStatus('idle')
        // In real app, trigger abort controller
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-lg backdrop-blur-md shadow-xl"
            >
                <div className="relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                    >
                        <Loader2 className="w-5 h-5 text-blue-400" />
                    </motion.div>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-100">Thinking...</span>
                    <span className="text-[10px] text-blue-300/70">Est. 2s</span>
                </div>

                <button
                    onClick={handleCancel}
                    className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Cancel processing"
                >
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                </button>
            </motion.div>
        </AnimatePresence>
    )
}
