
import React from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const ConnectionStatus: React.FC = () => {
    const { isOnline, checkConnection } = useAppStore()
    const [isChecking, setIsChecking] = React.useState(false)

    const handleRetry = async () => {
        setIsChecking(true)
        await checkConnection()
        setTimeout(() => setIsChecking(false), 1000)
    }

    return (
        <div className="flex items-center gap-2 group relative">
            <motion.div
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'} shadow-lg ${isOnline ? 'shadow-emerald-500/50' : 'shadow-rose-500/50'}`}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                }}
            />

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 backdrop-blur text-[10px] rounded text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                {isOnline ? 'Connected' : 'Offline'}
            </div>

            {!isOnline && (
                <motion.button
                    onClick={handleRetry}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    disabled={isChecking}
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <RefreshCw className={`w-3 h-3 text-rose-400 ${isChecking ? 'animate-spin' : ''}`} />
                </motion.button>
            )}
        </div>
    )
}
