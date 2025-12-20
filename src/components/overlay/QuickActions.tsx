
import React from 'react'
import { motion } from 'framer-motion'
import { Copy, Trash2, Settings, Zap } from 'lucide-react'
import clsx from 'clsx'

interface QuickActionsProps {
    onCopy: () => void
    onClear: () => void
    onSettings: () => void
    onTrigger: () => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onCopy, onClear, onSettings, onTrigger }) => {
    return (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <motion.button
                onClick={onTrigger}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 text-sm font-semibold",
                    "bg-gradient-to-r from-purple-600 to-blue-600",
                    "hover:from-purple-500 hover:to-blue-500",
                    "text-white rounded-lg shadow-lg shadow-purple-500/20",
                    "transition-all duration-200 border border-white/10"
                )}
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" }}
                whileTap={{ scale: 0.98 }}
            >
                <Zap className="w-4 h-4 fill-current" />
                Ask AI
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1 font-mono">⌘⇧A</span>
            </motion.button>

            <div className="flex-1" />

            <motion.button
                onClick={onCopy}
                className={clsx(
                    "p-2 rounded-lg transition-all duration-200",
                    "bg-white/5 hover:bg-purple-500/20",
                    "text-gray-400 hover:text-purple-300",
                    "border border-transparent hover:border-purple-500/30"
                )}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                title="Copy Response"
            >
                <Copy className="w-4 h-4" />
            </motion.button>

            <motion.button
                onClick={onClear}
                className={clsx(
                    "p-2 rounded-lg transition-all duration-200",
                    "bg-white/5 hover:bg-red-500/20",
                    "text-gray-400 hover:text-red-300",
                    "border border-transparent hover:border-red-500/30"
                )}
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                title="Clear"
            >
                <Trash2 className="w-4 h-4" />
            </motion.button>

            <motion.button
                onClick={onSettings}
                className={clsx(
                    "p-2 rounded-lg transition-all duration-200",
                    "bg-white/5 hover:bg-cyan-500/20",
                    "text-gray-400 hover:text-cyan-300",
                    "border border-transparent hover:border-cyan-500/30"
                )}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                title="Settings"
            >
                <Settings className="w-4 h-4" />
            </motion.button>
        </div>
    )
}
