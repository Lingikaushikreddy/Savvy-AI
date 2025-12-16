
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings as SettingsIcon, Monitor, Mic, BrainCircuit, Key, Shield, BookOpen, Save } from 'lucide-react'
import { useAppStore, Settings } from '../store/useAppStore'
import { Toaster, useToast } from './ui/toast' // Using our updated toast exports

type Category = 'general' | 'capture' | 'ai' | 'playbook' | 'apiKeys' | 'privacy'

const categories: { id: Category; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'capture', label: 'Capture', icon: <Monitor className="w-4 h-4" /> },
    { id: 'ai', label: 'AI & Models', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'playbook', label: 'Playbooks', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'apiKeys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
]

export const SettingsPanel: React.FC = () => {
    const { isSettingsOpen, toggleSettings, settings, updateSettings } = useAppStore()
    const [activeCategory, setActiveCategory] = useState<Category>('general')
    const [localSettings, setLocalSettings] = useState<Settings>(settings)
    const [isDirty, setIsDirty] = useState(false)
    const { toast } = useToast()

    // Sync local state when store settings change (initial load)
    useEffect(() => {
        if (isSettingsOpen) {
            setLocalSettings(settings)
            setIsDirty(false)
        }
    }, [isSettingsOpen, settings])

    const handleSave = () => {
        updateSettings(localSettings)
        setIsDirty(false)
        toast({
            title: "Settings Saved",
            description: "Your configuration has been updated successfully.",
            variant: "success",
        })
        // Here we would also trigger an IPC call to save to disk:
        // window.electronAPI.saveSettings(localSettings)
    }

    const handleChange = (category: Category, key: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category as keyof Settings],
                [key]: value
            }
        }))
        setIsDirty(true)
    }

    // Keyboard shortcut to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSettingsOpen && e.key === 'Escape') {
                if (isDirty) {
                    if (confirm("You have unsaved changes. Close anyway?")) {
                        toggleSettings()
                    }
                } else {
                    toggleSettings()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isSettingsOpen, isDirty, toggleSettings])

    if (!isSettingsOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-[800px] h-[600px] max-h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex overflow-hidden"
            >
                {/* Sidebar */}
                <div className="w-64 bg-gray-800/50 border-r border-gray-700 flex flex-col">
                    <div className="p-6 border-b border-gray-700/50">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-blue-500" />
                            Settings
                        </h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.id
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                                    }`}
                            >
                                {cat.icon}
                                {cat.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-gray-700/50 text-xs text-gray-500 text-center">
                        Savvy AI v1.0.0
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-gray-900">
                    <div className="flex-1 overflow-y-auto p-8">
                        <h3 className="text-2xl font-bold text-white mb-6 capitalize">{categories.find(c => c.id === activeCategory)?.label}</h3>

                        <div className="space-y-6 max-w-lg">
                            {/* GENERAL SETTINGS */}
                            {activeCategory === 'general' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Launch at Login</label>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.general.launchAtLogin}
                                            onChange={(e) => handleChange('general', 'launchAtLogin', e.target.checked)}
                                            className="w-5 h-5 bg-gray-800 border-gray-600 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Start Minimized</label>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.general.startMinimized}
                                            onChange={(e) => handleChange('general', 'startMinimized', e.target.checked)}
                                            className="w-5 h-5 bg-gray-800 border-gray-600 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                                        <select
                                            value={localSettings.general.theme}
                                            onChange={(e) => handleChange('general', 'theme', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="dark">Dark</option>
                                            <option value="light">Light</option>
                                            <option value="auto">Auto (System)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* CAPTURE SETTINGS */}
                            {activeCategory === 'capture' && (
                                <>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-300">Screen Capture Interval</label>
                                            <span className="text-sm text-gray-400">{localSettings.capture.interval}s</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1" max="10" step="1"
                                            value={localSettings.capture.interval}
                                            onChange={(e) => handleChange('capture', 'interval', Number(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Enable Screen Capture</label>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.capture.screenCaptureEnabled}
                                            onChange={(e) => handleChange('capture', 'screenCaptureEnabled', e.target.checked)}
                                            className="w-5 h-5 bg-gray-800 border-gray-600 rounded text-blue-600"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Enable Audio Capture</label>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.capture.audioCaptureEnabled}
                                            onChange={(e) => handleChange('capture', 'audioCaptureEnabled', e.target.checked)}
                                            className="w-5 h-5 bg-gray-800 border-gray-600 rounded text-blue-600"
                                        />
                                    </div>
                                </>
                            )}

                            {/* AI SETTINGS */}
                            {activeCategory === 'ai' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handleChange('ai', 'provider', 'openai')}
                                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${localSettings.ai.provider === 'openai'
                                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                    }`}
                                            >
                                                OpenAI
                                            </button>
                                            <button
                                                onClick={() => handleChange('ai', 'provider', 'anthropic')}
                                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${localSettings.ai.provider === 'anthropic'
                                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                                                    }`}
                                            >
                                                Anthropic
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                                        <select
                                            value={localSettings.ai.model}
                                            onChange={(e) => handleChange('ai', 'model', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                        >
                                            {localSettings.ai.provider === 'openai' ? (
                                                <>
                                                    <option value="gpt-4o">GPT-4o (Recommended)</option>
                                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-300">Temperature</label>
                                            <span className="text-sm text-gray-400">{localSettings.ai.temperature}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={localSettings.ai.temperature}
                                            onChange={(e) => handleChange('ai', 'temperature', Number(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </>
                            )}

                            {/* API KEYS SETTINGS */}
                            {activeCategory === 'apiKeys' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">OpenAI API Key</label>
                                        <input
                                            type="password"
                                            value={localSettings.apiKeys.openai}
                                            onChange={(e) => handleChange('apiKeys', 'openai', e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Anthropic API Key</label>
                                        <input
                                            type="password"
                                            value={localSettings.apiKeys.anthropic}
                                            onChange={(e) => handleChange('apiKeys', 'anthropic', e.target.value)}
                                            placeholder="sk-ant-..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg text-sm text-blue-300">
                                        Keys are stored locally on your device.
                                    </div>
                                </>
                            )}

                            {/* PLAYBOOK SETTINGS */}
                            {activeCategory === 'playbook' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-300">Auto-Detect Playbook</label>
                                        <input
                                            type="checkbox"
                                            checked={localSettings.playbook.autoDetect}
                                            onChange={(e) => handleChange('playbook', 'autoDetect', e.target.checked)}
                                            className="w-5 h-5 bg-gray-800 border-gray-600 rounded text-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Default Playbook</label>
                                        <select
                                            value={localSettings.playbook.defaultPlaybookId}
                                            onChange={(e) => handleChange('playbook', 'defaultPlaybookId', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value="GENERAL_MEETING">General Meeting</option>
                                            <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                                            <option value="SALES_CALL">Sales Call</option>
                                            <option value="VC_PITCH">VC Pitch</option>
                                            <option value="BEHAVIORAL_INTERVIEW">Behavioral Interview</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* PRIVACY SETTINGS */}
                            {activeCategory === 'privacy' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Data Retention</label>
                                        <select
                                            value={localSettings.privacy.retentionDays}
                                            onChange={(e) => handleChange('privacy', 'retentionDays', e.target.value === 'never' ? 'never' : Number(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                        >
                                            <option value={1}>24 Hours</option>
                                            <option value={7}>7 Days</option>
                                            <option value={30}>30 Days</option>
                                            <option value="never">Never (Don't Store)</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 border-t border-gray-700/50">
                                        <button className="w-full py-2.5 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium">
                                            Clear All App Data
                                        </button>
                                    </div>
                                </>
                            )}


                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-700/50 bg-gray-800/30 flex justify-end gap-3">
                        <button
                            onClick={toggleSettings}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all ${isDirty
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Save className="w-4 h-4" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
