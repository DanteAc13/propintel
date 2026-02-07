'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Plus, Camera, X } from 'lucide-react'
import { ObservationCard } from './ObservationCard'
import { ObservationForm } from './ObservationForm'
import type { SectionWithObservations } from '@/types/inspection'

type Props = {
  section: SectionWithObservations
  inspectionId: string
  propertyId: string
  inspectorId: string
  onSectionUpdate: () => void
}

export function SectionView({ section, inspectionId, propertyId, inspectorId, onSectionUpdate }: Props) {
  const [showNewObservation, setShowNewObservation] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [customComponent, setCustomComponent] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const defaultComponents = (section.template.default_components as string[]) || []

  const handleMarkNA = async (isNA: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_not_applicable: isNA }),
      })
      if (response.ok) {
        onSectionUpdate()
      }
    } catch (error) {
      console.error('Error updating section:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleMarkComplete = async (isComplete: boolean) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/sections/${section.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: isComplete }),
      })
      if (response.ok) {
        onSectionUpdate()
      }
    } catch (error) {
      console.error('Error updating section:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleComponentSelect = (component: string) => {
    setSelectedComponent(component)
    setShowNewObservation(true)
  }

  const handleCustomComponentSubmit = () => {
    if (customComponent.trim()) {
      setSelectedComponent(customComponent.trim())
      setShowNewObservation(true)
      setCustomComponent('')
    }
  }

  const handleObservationCreated = () => {
    setShowNewObservation(false)
    setSelectedComponent(null)
    onSectionUpdate()
  }

  const handleCancelObservation = () => {
    setShowNewObservation(false)
    setSelectedComponent(null)
  }

  if (section.is_not_applicable) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{section.template.name}</h2>
            <p className="text-muted-foreground">{section.template.description}</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              This section has been marked as Not Applicable
            </p>
            <Button
              variant="outline"
              onClick={() => handleMarkNA(false)}
              disabled={isUpdating}
            >
              Remove N/A Status
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{section.template.name}</h2>
          <p className="text-muted-foreground">{section.template.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="section-na"
              checked={section.is_not_applicable}
              onCheckedChange={handleMarkNA}
              disabled={isUpdating}
            />
            <Label htmlFor="section-na" className="text-sm">N/A</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="section-complete"
              checked={section.is_complete}
              onCheckedChange={handleMarkComplete}
              disabled={isUpdating || section.observations.length === 0}
            />
            <Label htmlFor="section-complete" className="text-sm">Complete</Label>
          </div>
        </div>
      </div>

      {/* New Observation Form */}
      {showNewObservation && selectedComponent && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">New Observation: {selectedComponent}</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCancelObservation}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ObservationForm
              sectionId={section.id}
              inspectionId={inspectionId}
              propertyId={propertyId}
              inspectorId={inspectorId}
              component={selectedComponent}
              onSuccess={handleObservationCreated}
              onCancel={handleCancelObservation}
            />
          </CardContent>
        </Card>
      )}

      {/* Component Presets */}
      {!showNewObservation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Add Observation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Chips */}
            <div className="flex flex-wrap gap-2">
              {defaultComponents.map((component) => (
                <Button
                  key={component}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleComponentSelect(component)}
                >
                  <Camera className="h-3 w-3 mr-1.5" />
                  {component}
                </Button>
              ))}
            </div>

            {/* Custom Component Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Custom component..."
                value={customComponent}
                onChange={(e) => setCustomComponent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomComponentSubmit()}
                className="flex-1"
              />
              <Button
                onClick={handleCustomComponentSubmit}
                disabled={!customComponent.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Observations */}
      {section.observations.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">
            Observations ({section.observations.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {section.observations.map((observation) => (
              <ObservationCard
                key={observation.id}
                observation={observation}
                onUpdate={onSectionUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {section.observations.length === 0 && !showNewObservation && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No observations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a component above to add your first observation
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
