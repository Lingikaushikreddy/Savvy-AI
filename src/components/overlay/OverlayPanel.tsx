
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ChevronRight, BrainCircuit } from 'lucide-react'
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

    // Handler for double-click to collapse/expand
    const handleHeaderDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleExpanded()
    }

    // Placeholder handlers
    const handleCopy = () => {
        navigator.clipboard.writeText(currentResponse)
    }

    const handleSettings = () => {
        toggleSettings()
    }

    return (
        <motion.div
            layout
            initial={{ width: 60, opacity: 0 }}
            animate={{
                width: isExpanded ? 500 : 70, // Collapsed state slightly wider than 60 for visual balance
                opacity: 1
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={clsx(
                "fixed top-12 right-12 z-50 flex flex-col",
                "bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden",
                "text-gray-100 font-sans antialiased",
                // Max height constraint for expanded state
                isExpanded ? "max-h-[600px] h-auto" : "h-14"
            )}
        >
            {/* Header / Drag Handle */}
            <div
                className="flex items-center justify-between px-3 h-14 shrink-0 cursor-move bg-white/5 select-none"
                onDoubleClick={handleHeaderDoubleClick}
                // In Electron, we might need a specific 'drag' region css property on this div
                // usually '-webkit-app-region: drag' but clickable items need 'no-drag'
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex items-center gap-3">
                    {/* Logo / Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400">
                        <BrainCircuit className="w-5 h-5" />
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col"
                            >
                                <span className="text-sm font-semibold tracking-wide">Savvy AI</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Context Copilot</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-3 " style={{ WebkitAppRegion: 'no-drag' } as any}>
                    {/* Status Components */}
                    <div className="flex items-center gap-2">
                        <ConnectionStatus />
                        <MicrophoneIndicator />
                    </div>

                    <button
                        onClick={toggleExpanded}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Using ChevronRight because 180 flip makes it Left, signaling 'back' */}
                            <ChevronRight className="w-4 h-4" />
                        </motion.div>
                    </button>
                </div>
            </div>

            {/* Body Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col flex-1 p-4 pt-0 overflow-hidden"
                    >
                        {/* Divider */}
                        <div className="h-px bg-gray-700/50 w-full mb-3" />

                        {/* Processing Status Overlay/Inline */}
                        {status === 'processing' && (
                            <div className="mb-3">
                                <ProcessingSpinner />
                            </div>
                        )}

                        <ResponseDisplay
                            content={currentResponse}
                            isStreaming={status === 'processing' || status === 'listening'} // Simplified loading state
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
