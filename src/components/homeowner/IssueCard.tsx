'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Paintbrush,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { IssueForHomeowner } from '@/types/homeowner'

type IssueCardProps = {
  issue: IssueForHomeowner
  isSelected: boolean
  onToggle: (issueId: string, selected: boolean) => void
  disabled?: boolean
}

const SEVERITY_ICONS = {
  CRITICAL: AlertTriangle,
  HIGH: AlertCircle,
  MEDIUM: Info,
  LOW: Paintbrush,
}

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-600 bg-red-50',
  HIGH: 'text-orange-600 bg-orange-50',
  MEDIUM: 'text-yellow-600 bg-yellow-50',
  LOW: 'text-blue-600 bg-blue-50',
}

export function IssueCard({ issue, isSelected, onToggle, disabled }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const Icon = SEVERITY_ICONS[issue.severity_label]
  const colorClass = SEVERITY_COLORS[issue.severity_label]
  const photos = issue.observation.media ?? []

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}>
      <CardContent className="p-4">
        {/* Header with toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`flex-shrink-0 p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 leading-snug">
                {issue.homeowner_description}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {issue.observation.section.template.name}
                </Badge>
                {issue.is_safety_hazard && (
                  <Badge variant="destructive" className="text-xs">
                    Safety
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Fix This / Not Now Toggle */}
          <div className="flex-shrink-0">
            {disabled ? (
              <Badge variant={isSelected ? 'default' : 'outline'}>
                {isSelected ? 'Selected' : 'Skipped'}
              </Badge>
            ) : (
              <Button
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggle(issue.id, !isSelected)}
                className="min-w-[90px]"
              >
                {isSelected ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Fix This
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Not Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Photos preview */}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {photos.slice(0, 3).map((photo, index) => (
              <div
                key={photo.id}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 relative"
              >
                <Image
                  src={photo.thumbnail_url ?? photo.storage_url}
                  alt={`Issue photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {photos.length > 3 && (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                +{photos.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Expandable details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-3 w-full"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Less details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              More details
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
              <p className="text-sm text-gray-700">
                {issue.observation.location_detail ?? issue.observation.section.template.name}
              </p>
            </div>
            {issue.observation.description_raw && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Inspector Notes</p>
                <p className="text-sm text-gray-700">{issue.observation.description_raw}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Urgency</p>
              <p className="text-sm text-gray-700">
                {issue.urgency === 'IMMEDIATE' && 'Should be fixed right away'}
                {issue.urgency === 'SHORT_TERM' && 'Should be fixed within a few months'}
                {issue.urgency === 'LONG_TERM' && 'Can wait, but plan for it'}
                {issue.urgency === 'MONITOR' && 'Keep an eye on this'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
