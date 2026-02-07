'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Trash2, AlertTriangle, MapPin } from 'lucide-react'
import type { ObservationWithMedia } from '@/types/inspection'

type Props = {
  observation: ObservationWithMedia
  onUpdate: () => void
}

const statusLabels: Record<string, string> = {
  DEFICIENT: 'Deficient',
  FUNCTIONAL: 'Functional',
  NOT_INSPECTED: 'Not Inspected',
  NOT_PRESENT: 'Not Present',
  MAINTENANCE_NEEDED: 'Maintenance Needed',
}

const severityLabels: Record<string, string> = {
  SAFETY_HAZARD: 'Safety Hazard',
  MAJOR_DEFECT: 'Major',
  MINOR_DEFECT: 'Minor',
  COSMETIC: 'Cosmetic',
  INFORMATIONAL: 'Info',
}

const severityColors: Record<string, string> = {
  SAFETY_HAZARD: 'bg-red-500 text-white',
  MAJOR_DEFECT: 'bg-orange-500 text-white',
  MINOR_DEFECT: 'bg-yellow-500 text-black',
  COSMETIC: 'bg-blue-500 text-white',
  INFORMATIONAL: 'bg-gray-500 text-white',
}

export function ObservationCard({ observation, onUpdate }: Props) {
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const primaryImage = observation.media[0]

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this observation?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/observations/${observation.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting observation:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImageClick = (url: string) => {
    setSelectedImage(url)
    setShowImageDialog(true)
  }

  const isSevere = observation.severity === 'SAFETY_HAZARD' || observation.severity === 'MAJOR_DEFECT'

  return (
    <>
      <Card className={isSevere ? 'border-orange-300 dark:border-orange-700' : ''}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            {primaryImage && (
              <button
                onClick={() => handleImageClick(primaryImage.storage_url)}
                className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
              >
                <img
                  src={primaryImage.thumbnail_url || primaryImage.storage_url}
                  alt={observation.component}
                  className="w-full h-full object-cover"
                />
              </button>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium truncate">{observation.component}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge
                      variant="outline"
                      className={severityColors[observation.severity]}
                    >
                      {observation.severity === 'SAFETY_HAZARD' && (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      )}
                      {severityLabels[observation.severity]}
                    </Badge>
                    <Badge variant="secondary">
                      {statusLabels[observation.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {observation.location_detail && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {observation.location_detail}
                </p>
              )}

              {observation.inspector_notes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {observation.inspector_notes}
                </p>
              )}

              {/* Additional images */}
              {observation.media.length > 1 && (
                <div className="flex gap-1.5 pt-1">
                  {observation.media.slice(1, 4).map((media) => (
                    <button
                      key={media.id}
                      onClick={() => handleImageClick(media.storage_url)}
                      className="w-10 h-10 rounded overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                    >
                      <img
                        src={media.thumbnail_url || media.storage_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {observation.media.length > 4 && (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      +{observation.media.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{observation.component}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative aspect-video">
              <img
                src={selectedImage}
                alt={observation.component}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {observation.media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {observation.media.map((media) => (
                <button
                  key={media.id}
                  onClick={() => setSelectedImage(media.storage_url)}
                  className={`shrink-0 w-16 h-16 rounded overflow-hidden ${
                    selectedImage === media.storage_url ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <img
                    src={media.thumbnail_url || media.storage_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
