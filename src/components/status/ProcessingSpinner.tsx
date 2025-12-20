
import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const ProcessingSpinner: React.FC = () => {
    const { cancelProcessing } = useAppStore()

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/40 rounded-xl backdrop-blur-md shadow-2xl relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 animate-pulse" />

            <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-md opacity-40 animate-pulse" />
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                        <Loader2 className="w-5 h-5 text-purple-400" />
                    </motion.div>
                </div>

                <div className="flex flex-col">
                    <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-blue-200">
                        Thinking...
                    </span>
                    <span className="text-[10px] text-purple-300/70 font-medium tracking-wide">
                        Processing Context
                    </span>
                </div>
            </div>

            <motion.button
                onClick={cancelProcessing}
                className="p-1.5 mt-0.5 rounded-lg hover:bg-white/10 text-purple-300 hover:text-white transition-colors relative z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <X className="w-4 h-4" />
            </motion.button>
        </motion.div>
    )
}
