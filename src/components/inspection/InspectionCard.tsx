'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { InspectionListItem } from '@/types/inspection'

type Props = {
  inspection: InspectionListItem
}

export function InspectionCard({ inspection }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const address = [
    inspection.property.address_line1,
    inspection.property.address_line2,
  ].filter(Boolean).join(', ')

  const cityState = `${inspection.property.city}, ${inspection.property.state} ${inspection.property.zip_code}`

  const scheduledDate = new Date(inspection.scheduled_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const totalSections = inspection.sections.length
  const completeSections = inspection.sections.filter(
    s => s.is_complete || s.is_not_applicable
  ).length
  const totalObservations = inspection.sections.reduce(
    (sum, s) => sum + s.observations.length,
    0
  )

  const handleStart = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/inspections/${inspection.id}/start`, {
        method: 'POST',
      })

      if (response.ok) {
        router.push(`/inspector/inspection/${inspection.id}`)
      } else {
        const error = await response.json()
        console.error('Failed to start inspection:', error)
      }
    } catch (error) {
      console.error('Error starting inspection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    router.push(`/inspector/inspection/${inspection.id}`)
  }

  const statusBadge = () => {
    switch (inspection.status) {
      case 'SCHEDULED':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>
      case 'IN_REVIEW':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">In Review</Badge>
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{address}</CardTitle>
            <CardDescription>{cityState}</CardDescription>
          </div>
          {statusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Scheduled:</span>
            <p className="font-medium">{scheduledDate}</p>
          </div>
          {inspection.status === 'IN_PROGRESS' && (
            <div>
              <span className="text-muted-foreground">Progress:</span>
              <p className="font-medium">{completeSections}/{totalSections} sections</p>
            </div>
          )}
          {inspection.status === 'IN_PROGRESS' && totalObservations > 0 && (
            <div>
              <span className="text-muted-foreground">Observations:</span>
              <p className="font-medium">{totalObservations}</p>
            </div>
          )}
        </div>

        <div className="pt-2">
          {inspection.status === 'SCHEDULED' && (
            <Button
              onClick={handleStart}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Starting...' : 'Start Inspection'}
            </Button>
          )}
          {inspection.status === 'IN_PROGRESS' && (
            <Button
              onClick={handleContinue}
              variant="default"
              className="w-full"
            >
              Continue Inspection
            </Button>
          )}
          {(inspection.status === 'IN_REVIEW' || inspection.status === 'APPROVED') && (
            <Button
              onClick={handleContinue}
              variant="outline"
              className="w-full"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
