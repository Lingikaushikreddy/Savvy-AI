import React from 'react'
import { X, Zap, Shield, Users, BarChart3 } from 'lucide-react'

interface UpgradePromptProps {
  feature: string
  currentTier: string
  requiredTier: string
  onUpgrade: () => void
  onDismiss: () => void
  show: boolean
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  currentTier,
  requiredTier,
  onUpgrade,
  onDismiss,
  show
}) => {
  if (!show) return null

  const tierBenefits: Record<string, { name: string; price: string; features: string[] }> = {
    pro: {
      name: 'Pro',
      price: '$29/month',
      features: [
        '500 conversations/month',
        '1,000 screenshots/day',
        '1,000 audio minutes/month',
        'Advanced playbooks',
        'CRM integrations',
        'Voice coaching',
        'Priority support'
      ]
    },
    team: {
      name: 'Team',
      price: '$99/month',
      features: [
        '5,000 conversations/month',
        '10,000 screenshots/day',
        '10,000 audio minutes/month',
        'API access',
        'Team collaboration',
        'Advanced analytics',
        'Dedicated support'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Unlimited usage',
        'Custom integrations',
        'SLA guarantee',
        'On-premise deployment',
        'Custom training',
        'Account manager'
      ]
    }
  }

  const benefit = tierBenefits[requiredTier] || tierBenefits.pro

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Upgrade to {benefit.name}</h3>
              <p className="text-gray-400 text-sm">
                Unlock <span className="font-semibold text-blue-400">{feature}</span> and more
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl font-bold text-white">{benefit.price}</span>
              {requiredTier === 'pro' && (
                <span className="text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  Most Popular
                </span>
              )}
            </div>

            <ul className="space-y-2">
              {benefit.features.map((feat, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onUpgrade}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-105"
            >
              Upgrade Now
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Cancel anytime • 14-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}

