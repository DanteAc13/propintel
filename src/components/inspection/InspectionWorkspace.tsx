'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { SectionRail, SectionRailMobile } from './SectionRail'
import { SectionView } from './SectionView'
import type { InspectionWithProperty, SectionWithObservations } from '@/types/inspection'

type Props = {
  initialInspection: InspectionWithProperty
  inspectorId: string
}

export function InspectionWorkspace({ initialInspection, inspectorId }: Props) {
  const router = useRouter()
  const [inspection, setInspection] = useState(initialInspection)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialInspection.sections[0]?.id || null
  )
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const activeSection = inspection.sections.find((s) => s.id === activeSectionId)

  const totalSections = inspection.sections.length
  const completedSections = inspection.sections.filter(
    (s) => s.is_complete || s.is_not_applicable
  ).length
  const totalObservations = inspection.sections.reduce(
    (sum, s) => sum + s.observations.length,
    0
  )
  const allSectionsAddressed = completedSections === totalSections

  const refreshInspection = useCallback(async () => {
    try {
      const response = await fetch(`/api/inspections/${inspection.id}`)
      if (response.ok) {
        const data = await response.json()
        setInspection(data)
      }
    } catch (error) {
      console.error('Error refreshing inspection:', error)
    }
  }, [inspection.id])

  const handleSectionUpdate = () => {
    refreshInspection()
  }

  const handleCompleteInspection = async () => {
    setIsCompleting(true)
    setCompleteError(null)

    try {
      const response = await fetch(`/api/inspections/${inspection.id}/complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete inspection')
      }

      router.push('/inspector/dashboard')
    } catch (error) {
      console.error('Error completing inspection:', error)
      setCompleteError(error instanceof Error ? error.message : 'Failed to complete')
      setIsCompleting(false)
    }
  }

  const address = [
    inspection.property.address_line1,
    inspection.property.address_line2,
  ].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/inspector/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{address}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{completedSections}/{totalSections} sections</span>
                <span>•</span>
                <span>{totalObservations} observations</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={inspection.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
              {inspection.status.replace('_', ' ')}
            </Badge>
            <Button
              onClick={() => setShowCompleteDialog(true)}
              disabled={!allSectionsAddressed || isCompleting}
              className="hidden md:flex"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Section Rail */}
        <div className="hidden md:block w-64 border-r overflow-hidden">
          <SectionRail
            sections={inspection.sections}
            activeSectionId={activeSectionId}
            onSectionSelect={setActiveSectionId}
          />
        </div>

        {/* Section Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection ? (
            <SectionView
              section={activeSection}
              inspectionId={inspection.id}
              propertyId={inspection.property_id}
              inspectorId={inspectorId}
              onSectionUpdate={handleSectionUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a section to begin
            </div>
          )}
        </div>
      </div>

      {/* Mobile Section Rail */}
      <div className="md:hidden">
        <SectionRailMobile
          sections={inspection.sections}
          activeSectionId={activeSectionId}
          onSectionSelect={setActiveSectionId}
        />
      </div>

      {/* Mobile Complete Button */}
      <div className="md:hidden border-t p-3 bg-background">
        <Button
          onClick={() => setShowCompleteDialog(true)}
          disabled={!allSectionsAddressed || isCompleting}
          className="w-full"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Inspection
        </Button>
      </div>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit the inspection for review. You have recorded{' '}
              <strong>{totalObservations} observations</strong> across{' '}
              <strong>{totalSections} sections</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {completeError && (
            <p className="text-sm text-destructive">{completeError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteInspection}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Review'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
