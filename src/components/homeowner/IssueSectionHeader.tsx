'use client'

import { AlertTriangle, AlertCircle, Info, Paintbrush } from 'lucide-react'
import { SEVERITY_DISPLAY } from '@/types/homeowner'

type IssueSectionHeaderProps = {
  type: 'safety' | 'major' | 'minor' | 'cosmetic'
  count: number
}

const ICONS = {
  safety: AlertTriangle,
  major: AlertCircle,
  minor: Info,
  cosmetic: Paintbrush,
}

export function IssueSectionHeader({ type, count }: IssueSectionHeaderProps) {
  const config = SEVERITY_DISPLAY[type]
  const Icon = ICONS[type]

  if (count === 0) return null

  return (
    <div className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border mb-3`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.textColor}`} />
        <div>
          <h2 className={`font-semibold ${config.textColor}`}>
            {config.label} ({count})
          </h2>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
      </div>
    </div>
  )
}
