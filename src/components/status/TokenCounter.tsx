
import React from 'react'
import { motion } from 'framer-motion'
import { Coins, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const TokenCounter: React.FC = () => {
    const { tokenUsage } = useAppStore()
    const { current, limit, cost } = tokenUsage

    const percentage = Math.min(100, (current / limit) * 100)
    const isWarning = percentage > 80
    const isCritical = percentage > 95

    return (
        <div className="flex flex-col gap-1 w-full max-w-[200px] p-2 rounded-lg bg-black/10 border border-white/5">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-300">
                    <Coins className="w-3 h-3 text-yellow-500/80" />
                    <span>Tokens</span>
                </div>
                <span className="font-mono text-gray-400">
                    ${cost.toFixed(4)}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>{current.toLocaleString()}</span>
                <span>{limit.toLocaleString()}</span>
            </div>

            {isWarning && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Limit approaching</span>
                </div>
            )}
        </div>
    )
}
