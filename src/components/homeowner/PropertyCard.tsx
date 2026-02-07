'use client'

import Link from 'next/link'
import { Home, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PropertyWithSummary } from '@/types/homeowner'

type PropertyCardProps = {
  property: PropertyWithSummary
}

export function PropertyCard({ property }: PropertyCardProps) {
  const getStatusBadge = () => {
    if (!property.lastInspectionDate) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600">
          No inspection
        </Badge>
      )
    }

    if (property.hasActiveProject) {
      const statusLabels: Record<string, string> = {
        DRAFT: 'Selecting fixes',
        SCOPE_LOCKED: 'Scope locked',
        BIDDING: 'Getting bids',
        ACTIVE: 'Work in progress',
      }
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {statusLabels[property.projectStatus ?? 'DRAFT']}
        </Badge>
      )
    }

    if (property.issueCount > 0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700">
          {property.issueCount} issue{property.issueCount !== 1 ? 's' : ''} found
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="bg-green-50 text-green-700">
        <CheckCircle className="mr-1 h-3 w-3" />
        All clear
      </Badge>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Link href={`/homeowner/properties/${property.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Home className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {property.address_line1}
                </h3>
                <p className="text-sm text-gray-500">
                  {property.city}, {property.state} {property.zip_code}
                </p>
                {property.lastInspectionDate && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Inspected {formatDate(property.lastInspectionDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge()}
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
          </div>

          {property.issueCount > 0 && !property.hasActiveProject && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-gray-600">
                Review issues and start a project
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
