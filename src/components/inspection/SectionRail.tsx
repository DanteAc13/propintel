'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Home,
  Layers,
  Droplets,
  Zap,
  Thermometer,
  LayoutGrid,
  Wind,
  Microwave,
  Warehouse,
  Waves,
  Trees,
  Clipboard,
  Building,
  Check,
  Minus,
} from 'lucide-react'
import type { SectionWithObservations } from '@/types/inspection'

// Map icon names from database to Lucide components
const iconMap: Record<string, React.ElementType> = {
  home: Home,
  building: Building,
  layers: Layers,
  droplets: Droplets,
  zap: Zap,
  thermometer: Thermometer,
  layout: LayoutGrid,
  wind: Wind,
  microwave: Microwave,
  warehouse: Warehouse,
  waves: Waves,
  trees: Trees,
  clipboard: Clipboard,
}

type Props = {
  sections: SectionWithObservations[]
  activeSectionId: string | null
  onSectionSelect: (sectionId: string) => void
  className?: string
}

export function SectionRail({ sections, activeSectionId, onSectionSelect, className }: Props) {
  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Sections
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {sections.map((section) => {
            const Icon = iconMap[section.template.icon] || Clipboard
            const isActive = section.id === activeSectionId
            const observationCount = section.observations.length
            const isComplete = section.is_complete
            const isNA = section.is_not_applicable

            return (
              <button
                key={section.id}
                onClick={() => onSectionSelect(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                  (isComplete || isNA) && 'opacity-75'
                )}
              >
                <div className={cn(
                  'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  isComplete && 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
                  isNA && 'bg-gray-100 text-gray-400 dark:bg-gray-800',
                  !isComplete && !isNA && 'bg-muted'
                )}>
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isNA ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    (isComplete || isNA) && 'text-muted-foreground'
                  )}>
                    {section.template.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isNA ? (
                      'N/A'
                    ) : isComplete ? (
                      `${observationCount} observation${observationCount !== 1 ? 's' : ''}`
                    ) : observationCount > 0 ? (
                      `${observationCount} observation${observationCount !== 1 ? 's' : ''}`
                    ) : (
                      'Not started'
                    )}
                  </p>
                </div>
                {observationCount > 0 && !isNA && (
                  <Badge variant="secondary" className="shrink-0">
                    {observationCount}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}

// Mobile version - horizontal scrollable
export function SectionRailMobile({ sections, activeSectionId, onSectionSelect }: Props) {
  return (
    <div className="border-t bg-background">
      <ScrollArea className="w-full">
        <div className="flex gap-2 p-2">
          {sections.map((section) => {
            const Icon = iconMap[section.template.icon] || Clipboard
            const isActive = section.id === activeSectionId
            const observationCount = section.observations.length
            const isComplete = section.is_complete
            const isNA = section.is_not_applicable

            return (
              <button
                key={section.id}
                onClick={() => onSectionSelect(section.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[72px] transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                  (isComplete || isNA) && 'opacity-75'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center relative',
                  isComplete && 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
                  isNA && 'bg-gray-100 text-gray-400 dark:bg-gray-800',
                  !isComplete && !isNA && 'bg-muted'
                )}>
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : isNA ? (
                    <Minus className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                  {observationCount > 0 && !isNA && !isComplete && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {observationCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight max-w-[60px] truncate">
                  {section.template.name}
                </span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
