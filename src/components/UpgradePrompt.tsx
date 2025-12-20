import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Crown, Check, Zap } from 'lucide-react'

interface UpgradePromptProps {
    isOpen: boolean
    onClose: () => void
    featureName?: string
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ isOpen, onClose, featureName }) => {
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen) return null

    const handleUpgrade = () => {
        setIsLoading(true)
        // Simulate external link or IPC
        setTimeout(() => {
            window.open('https://savvyai.com/pricing', '_blank')
            setIsLoading(false)
            onClose()
        }, 500)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-gradient-to-b from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative h-32 bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-purple-600/20 flex flex-col items-center justify-center">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20 mb-3">
                            <Crown className="w-6 h-6 text-white" fill="currentColor" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Upgrade to Pro</h2>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {featureName && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                <Lock className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-red-200">
                                    <span className="font-semibold text-white">{featureName}</span> is locked.
                                </span>
                            </div>
                        )}

                        <p className="text-gray-300 text-center mb-8 leading-relaxed">
                            Unlock the full power of Savvy AI to crush your meetings and close more deals.
                        </p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-4 h-4" /></div>
                                <span className="text-gray-200 text-sm">Real-time Voice Coaching</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-4 h-4" /></div>
                                <span className="text-gray-200 text-sm">Unlimited Audio Processing</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-4 h-4" /></div>
                                <span className="text-gray-200 text-sm">CRM Integrations (Salesforce, HubSpot)</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="p-1 rounded bg-green-500/20 text-green-400"><Check className="w-4 h-4" /></div>
                                <span className="text-gray-200 text-sm">Auto-Meeting Detection (Zoom/Meet)</span>
                            </div>
                        </div>

                        <button
                            onClick={handleUpgrade}
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Loading...' : (
                                <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    Unlock Pro for $29/mo
                                </>
                            )}
                        </button>

                        <div className="mt-4 text-center">
                            <button className="text-xs text-gray-500 hover:text-gray-400 underline decoration-gray-700">
                                Restore Purchase
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
