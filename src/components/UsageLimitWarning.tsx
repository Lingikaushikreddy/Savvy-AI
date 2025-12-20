import React from 'react'
import { AlertTriangle, TrendingUp } from 'lucide-react'

interface UsageLimitWarningProps {
  feature: string
  current: number
  limit: number
  period: 'day' | 'month'
  onUpgrade: () => void
}

export const UsageLimitWarning: React.FC<UsageLimitWarningProps> = ({
  feature,
  current,
  limit,
  period,
  onUpgrade
}) => {
  const percentage = (current / limit) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  if (!isNearLimit) return null

  return (
    <div className={`rounded-lg p-4 mb-4 ${
      isAtLimit 
        ? 'bg-red-900/20 border border-red-500/50' 
        : 'bg-yellow-900/20 border border-yellow-500/50'
    }`}>
      <div className="flex items-start">
        <AlertTriangle className={`w-5 h-5 mr-3 mt-0.5 ${
          isAtLimit ? 'text-red-400' : 'text-yellow-400'
        }`} />
        <div className="flex-1">
          <h4 className={`font-semibold mb-1 ${
            isAtLimit ? 'text-red-300' : 'text-yellow-300'
          }`}>
            {isAtLimit ? 'Limit Reached' : 'Approaching Limit'}
          </h4>
          <p className="text-sm text-gray-300 mb-2">
            You've used {current} of {limit} {feature} this {period}.
            {isAtLimit && ' Upgrade to continue using this feature.'}
          </p>
          
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Usage</span>
              <span>{current} / {limit}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isAtLimit ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  )
}

