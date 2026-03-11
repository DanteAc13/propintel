'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

type AddPropertyDialogProps = {
  onPropertyCreated: () => void
}

const PROPERTY_TYPES = [
  { value: 'SINGLE_FAMILY', label: 'Single Family' },
  { value: 'CONDO', label: 'Condo' },
  { value: 'TOWNHOUSE', label: 'Townhouse' },
  { value: 'MULTI_FAMILY', label: 'Multi-Family' },
  { value: 'MOBILE_HOME', label: 'Mobile Home' },
] as const

export function AddPropertyDialog({ onPropertyCreated }: AddPropertyDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('FL')
  const [zipCode, setZipCode] = useState('')
  const [propertyType, setPropertyType] = useState('SINGLE_FAMILY')
  const [yearBuilt, setYearBuilt] = useState('')
  const [squareFootage, setSquareFootage] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [hasPool, setHasPool] = useState(false)
  const [stories, setStories] = useState('')

  function resetForm() {
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setState('FL')
    setZipCode('')
    setPropertyType('SINGLE_FAMILY')
    setYearBuilt('')
    setSquareFootage('')
    setBedrooms('')
    setBathrooms('')
    setHasPool(false)
    setStories('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        address_line1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        property_type: propertyType,
        has_pool: hasPool,
      }
      if (addressLine2.trim()) body.address_line2 = addressLine2.trim()
      if (yearBuilt) body.year_built = parseInt(yearBuilt, 10)
      if (squareFootage) body.square_footage = parseInt(squareFootage, 10)
      if (bedrooms) body.bedrooms = parseInt(bedrooms, 10)
      if (bathrooms) body.bathrooms = parseFloat(bathrooms)
      if (stories) body.stories = parseInt(stories, 10)

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create property')
      }

      toast.success('Property added successfully')
      resetForm()
      setOpen(false)
      onPropertyCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = addressLine1.trim() && city.trim() && state.trim() && /^\d{5}(-\d{4})?$/.test(zipCode.trim())

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Enter the property address and details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              placeholder="123 Main Street"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Unit / Suite</Label>
            <Input
              id="address2"
              placeholder="Apt 4B"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Miami"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="FL"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip Code *</Label>
              <Input
                id="zip"
                placeholder="33101"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Property details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year Built</Label>
              <Input
                id="year"
                type="number"
                placeholder="2005"
                min={1800}
                max={new Date().getFullYear() + 1}
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sqft">Sq. Footage</Label>
              <Input
                id="sqft"
                type="number"
                placeholder="2400"
                min={1}
                value={squareFootage}
                onChange={(e) => setSquareFootage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beds">Bedrooms</Label>
              <Input
                id="beds"
                type="number"
                placeholder="3"
                min={0}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baths">Bathrooms</Label>
              <Input
                id="baths"
                type="number"
                placeholder="2.5"
                min={0}
                step={0.5}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stories">Stories</Label>
              <Input
                id="stories"
                type="number"
                placeholder="2"
                min={1}
                max={10}
                value={stories}
                onChange={(e) => setStories(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch
                id="pool"
                checked={hasPool}
                onCheckedChange={setHasPool}
              />
              <Label htmlFor="pool">Has Pool</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Property
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
