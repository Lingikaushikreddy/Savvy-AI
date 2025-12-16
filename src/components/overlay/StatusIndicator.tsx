
import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mic, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { AppState } from '../../store/useAppStore'

interface StatusIndicatorProps {
    status: AppState
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/50 border border-gray-700">
            {status === 'idle' && <Zap className="w-4 h-4 text-gray-400" />}

            {status === 'listening' && (
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    <Mic className="w-4 h-4 text-blue-500" />
                </motion.div>
            )}

            {status === 'processing' && (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                    <Loader2 className="w-4 h-4 text-yellow-500" />
                </motion.div>
            )}

            {status === 'ready' && <CheckCircle2 className="w-4 h-4 text-green-500" />}

            {status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
        </div>
    )
}
