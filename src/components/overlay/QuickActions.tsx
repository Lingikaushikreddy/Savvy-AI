
import React from 'react'
import { Copy, Trash2, Settings, Command } from 'lucide-react'

interface QuickActionsProps {
    onCopy: () => void
    onClear: () => void
    onSettings: () => void
    onTrigger: () => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onCopy, onClear, onSettings, onTrigger }) => {
    return (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700/50">
            <button
                onClick={onTrigger}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
                <Command className="w-3 h-3" />
                Ask AI
                <span className="text-blue-200 ml-1 text-[10px]">⌘+⏎</span>
            </button>

            <div className="flex-1" />

            <button
                onClick={onCopy}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Copy Response (Cmd+C)"
            >
                <Copy className="w-3.5 h-3.5" />
            </button>

            <button
                onClick={onClear}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                title="Clear (Cmd+K)"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
                onClick={onSettings}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
                <Settings className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
