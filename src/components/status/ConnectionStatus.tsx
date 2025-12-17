
import React from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export const ConnectionStatus: React.FC = () => {
    const { connectionStatus, setConnectionStatus } = useAppStore()
    const isOnline = connectionStatus === 'online'

    const handleRetry = () => {
        // Mock retry logic
        setConnectionStatus('online')
    }

    return (
        <div className="flex items-center gap-2 group relative">
            <div
                className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}
            />

            {!isOnline && (
                <button
                    onClick={handleRetry}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <RefreshCw className="w-3 h-3 text-gray-400" />
                </button>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {isOnline ? 'Connected' : 'Offline'}
            </div>
        </div>
    )
}
