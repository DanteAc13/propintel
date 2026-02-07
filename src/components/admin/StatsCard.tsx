'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

type StatsCardProps = {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color?: 'default' | 'amber' | 'green' | 'red' | 'blue'
  onClick?: () => void
}

const COLORS = {
  default: 'bg-gray-100 text-gray-600',
  amber: 'bg-amber-100 text-amber-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'default',
  onClick,
}: StatsCardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
    >
      <Component onClick={onClick} className="w-full text-left">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`p-2 rounded-lg ${COLORS[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Component>
    </Card>
  )
}
