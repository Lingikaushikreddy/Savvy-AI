
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ChevronRight, BrainCircuit, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ResponseDisplay } from './ResponseDisplay'
import { QuickActions } from './QuickActions'
import { MicrophoneIndicator } from '../status/MicrophoneIndicator'
import { ConnectionStatus } from '../status/ConnectionStatus'
import { ProcessingSpinner } from '../status/ProcessingSpinner'

export const OverlayPanel: React.FC = () => {
    const {
        isExpanded,
        toggleExpanded,
        status,
        currentResponse,
        clearData,
        triggerAI,
        toggleSettings
    } = useAppStore()

    const handleHeaderDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleExpanded()
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(currentResponse)
    }

    const handleSettings = () => {
        toggleSettings()
    }

    return (
        <motion.div
            layout
            initial={{ width: 60, opacity: 0, scale: 0.95 }}
            animate={{
                width: isExpanded ? 550 : 80,
                opacity: 1,
                scale: 1
            }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }}
            className={clsx(
                "fixed top-12 right-12 z-50 flex flex-col",
                "glass-card rounded-2xl overflow-hidden",
                "text-white font-sans antialiased",
                "gradient-border",
                isExpanded ? "max-h-[700px] h-auto" : "h-20"
            )}
        >
            {/* Header / Drag Handle */}
            <div
                className={clsx(
                    "flex items-center justify-between px-5 h-20 shrink-0 cursor-move select-none",
                    "bg-gradient-to-b from-white/5 to-transparent",
                    "border-b border-white/5"
                )}
                onDoubleClick={handleHeaderDoubleClick}
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex items-center gap-4">
                    {/* Logo / Icon with Glow */}
                    <motion.div
                        className={clsx(
                            "flex items-center justify-center w-10 h-10 rounded-xl",
                            "bg-gradient-to-br from-purple-500 to-blue-500",
                            "text-white shadow-lg"
                        )}
                        animate={{
                            boxShadow: [
                                '0 0 20px rgba(139, 92, 246, 0.5)',
                                '0 0 30px rgba(59, 130, 246, 0.6)',
                                '0 0 20px rgba(139, 92, 246, 0.5)'
                            ]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <BrainCircuit className="w-6 h-6" />
                    </motion.div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col"
                            >
                                <span className="text-sm font-bold tracking-wide text-gradient">
                                    Savvy AI
                                </span>
                                <span className="text-[10px] text-purple-300/70 uppercase tracking-wider font-medium flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Context Copilot
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {/* Status Components */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                className="flex items-center gap-2"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <ConnectionStatus />
                                <MicrophoneIndicator />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.button
                        onClick={toggleExpanded}
                        className={clsx(
                            "p-2 rounded-lg transition-all duration-200",
                            "text-purple-300 hover:text-white",
                            "hover:bg-purple-500/20 active:scale-95",
                            "border border-transparent hover:border-purple-500/30"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 90 : -90 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </motion.div>
                    </motion.button>
                </div>
            </div>

            {/* Body Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col flex-1 p-5 pt-4 overflow-hidden"
                    >
                        {/* Gradient Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent w-full mb-4" />

                        {/* Processing Status */}
                        {status === 'processing' && (
                            <motion.div
                                className="mb-4"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <ProcessingSpinner />
                            </motion.div>
                        )}

                        <ResponseDisplay
                            content={currentResponse}
                            isStreaming={status === 'processing' || status === 'listening'}
                        />

                        <QuickActions
                            onCopy={handleCopy}
                            onClear={clearData}
                            onSettings={handleSettings}
                            onTrigger={triggerAI}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
