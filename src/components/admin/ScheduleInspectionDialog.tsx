'use client'

import { useEffect, useState } from 'react'
import { Loader2, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ScheduleInspectionDialogProps = {
  onInspectionCreated: () => void
}

type PropertyOption = {
  id: string
  address_line1: string
  city: string
  state: string
}

type InspectorOption = {
  id: string
  first_name: string
  last_name: string
  email: string
  active_inspections: number
}

export function ScheduleInspectionDialog({ onInspectionCreated }: ScheduleInspectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Options
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [inspectors, setInspectors] = useState<InspectorOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  // Form state
  const [propertyId, setPropertyId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [inspectorId, setInspectorId] = useState('')
  const [notes, setNotes] = useState('')

  // Load properties and inspectors when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadOptions() {
      setIsLoadingOptions(true)
      try {
        const [propertiesRes, inspectorsRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/admin/inspections?queue=assignment'),
        ])

        if (propertiesRes.ok) {
          const propData = await propertiesRes.json()
          // Properties endpoint returns { data: [...], pagination: {...} }
          const propList = (propData.data || propData).map((p: Record<string, string>) => ({
            id: p.id,
            address_line1: p.address_line1,
            city: p.city,
            state: p.state,
          }))
          setProperties(propList)
        }

        if (inspectorsRes.ok) {
          const inspData = await inspectorsRes.json()
          setInspectors(inspData.availableInspectors || [])
        }
      } catch (err) {
        console.error('Failed to load options:', err)
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadOptions()
  }, [open])

  function resetForm() {
    setPropertyId('')
    setScheduledDate('')
    setInspectorId('')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        property_id: propertyId,
        scheduled_date: new Date(scheduledDate).toISOString(),
      }
      if (inspectorId && inspectorId !== 'none') body.inspector_id = inspectorId
      if (notes.trim()) body.notes = notes.trim()

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to schedule inspection')
      }

      toast.success('Inspection scheduled')
      resetForm()
      setOpen(false)
      onInspectionCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule inspection')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Minimum date: today
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Schedule Inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
          <DialogDescription>
            Select a property and date. You can assign an inspector now or later.
          </DialogDescription>
        </DialogHeader>

        {isLoadingOptions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 && (
                    <SelectItem value="_none" disabled>
                      No properties available
                    </SelectItem>
                  )}
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.address_line1}, {p.city} {p.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Scheduled Date *</Label>
              <Input
                id="date"
                type="datetime-local"
                min={today + 'T00:00'}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector (optional)</Label>
              <Select value={inspectorId} onValueChange={setInspectorId}>
                <SelectTrigger id="inspector">
                  <SelectValue placeholder="Assign later" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Assign later</SelectItem>
                  {inspectors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.first_name} {i.last_name} ({i.active_inspections} active)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Special instructions, access codes, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!propertyId || !scheduledDate || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
