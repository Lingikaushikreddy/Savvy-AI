
import React, { useEffect, useState } from 'react'
import { ShortcutMap, ShortcutConfig } from '../../shared/ipc-types'

export const ShortcutEditor: React.FC = () => {
    const [shortcuts, setShortcuts] = useState<ShortcutMap>({})
    const [editingAction, setEditingAction] = useState<string | null>(null)
    const [recordedKey, setRecordedKey] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadShortcuts()
    }, [])

    const loadShortcuts = async () => {
        const list = await window.api.shortcuts.getAll()
        setShortcuts(list)
    }

    const handleEdit = (action: string) => {
        setEditingAction(action)
        setRecordedKey('')
        setError(null)
    }

    const handleCancel = () => {
        setEditingAction(null)
        setRecordedKey('')
        setError(null)
    }

    const handleReset = async () => {
        if (confirm('Reset all shortcuts to defaults?')) {
            await window.api.shortcuts.reset()
            loadShortcuts()
        }
    }

    const handleSave = async (action: string) => {
        if (!recordedKey) return

        // Check conflicts
        const conflict = Object.values(shortcuts).find(s => s.key === recordedKey && s.action !== action)
        if (conflict) {
            setError(`Conflict with "${conflict.description}"`)
            return
        }

        try {
            await window.api.shortcuts.update(action, recordedKey)
            await loadShortcuts()
            setEditingAction(null)
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const modifiers = []
        if (e.metaKey || e.ctrlKey) modifiers.push('CommandOrControl')
        if (e.altKey) modifiers.push('Alt')
        if (e.shiftKey) modifiers.push('Shift')

        let key = e.key.toUpperCase()
        if (key === 'CONTROL' || key === 'META' || key === 'ALT' || key === 'SHIFT') return // Just modifier pressed

        // Fix logic for keys like "ArrowUp"
        if (key === 'ARROWUP') key = 'Up'
        if (key === 'ARROWDOWN') key = 'Down'
        if (key === 'ARROWLEFT') key = 'Left'
        if (key === 'ARROWRIGHT') key = 'Right'
        if (key === 'ESCAPE') key = 'Escape'
        if (key === ' ') key = 'Space'

        const combo = [...modifiers, key].join('+')
        setRecordedKey(combo)
    }

    return (
        <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
                <button
                    onClick={handleReset}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                    Reset Defaults
                </button>
            </div>

            <div className="space-y-4">
                {Object.values(shortcuts).map((shortcut) => (
                    <div
                        key={shortcut.action}
                        className={`flex items-center justify-between p-3 rounded-lg border ${editingAction === shortcut.action ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'
                            }`}
                    >
                        <span className="font-medium text-white/90">{shortcut.description}</span>

                        <div className="flex items-center gap-3">
                            {editingAction === shortcut.action ? (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="relative"
                                        onKeyDown={handleKeyDown}
                                        tabIndex={0}
                                        ref={el => el?.focus()}
                                        onBlur={() => !recordedKey && handleCancel()}
                                    >
                                        <div className={`px-4 py-1.5 min-w-[120px] text-center bg-black/40 rounded border ${error ? 'border-red-500' : 'border-primary'} text-white font-mono text-sm`}>
                                            {recordedKey || 'Press keys...'}
                                        </div>
                                        {error && (
                                            <div className="absolute top-full right-0 mt-1 text-xs text-red-500 whitespace-nowrap">
                                                {error}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleSave(shortcut.action)}
                                        disabled={!recordedKey}
                                        className="p-1.5 text-green-400 hover:bg-green-400/10 rounded"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleEdit(shortcut.action)}
                                    className="px-3 py-1.5 bg-black/40 border border-white/10 rounded text-sm font-mono text-white/70 hover:text-white hover:border-white/30 transition-all min-w-[100px]"
                                >
                                    {shortcut.key}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-xs text-white/40">
                Note: Global shortcuts work even when Savvy AI is in the background.
            </div>
        </div>
    )
}
