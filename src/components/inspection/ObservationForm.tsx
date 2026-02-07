'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, X, Loader2, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { ObservationStatus, ObservationSeverity } from '@prisma/client'

type AIAnalysis = {
  component: string
  condition: string
  severity: 'SAFETY' | 'MAJOR' | 'MINOR' | 'COSMETIC'
  description: string
  recommended_action: string
}

const AI_SEVERITY_MAP: Record<string, ObservationSeverity> = {
  SAFETY: 'SAFETY_HAZARD',
  MAJOR: 'MAJOR_DEFECT',
  MINOR: 'MINOR_DEFECT',
  COSMETIC: 'COSMETIC',
}

const AI_CONDITION_TO_STATUS: Record<string, ObservationStatus> = {
  deficient: 'DEFICIENT',
  damaged: 'DEFICIENT',
  broken: 'DEFICIENT',
  failed: 'DEFICIENT',
  deteriorated: 'DEFICIENT',
  maintenance: 'MAINTENANCE_NEEDED',
  aging: 'MAINTENANCE_NEEDED',
  wear: 'MAINTENANCE_NEEDED',
  functional: 'FUNCTIONAL',
  good: 'FUNCTIONAL',
  normal: 'FUNCTIONAL',
}

type Props = {
  sectionId: string
  inspectionId: string
  propertyId: string
  inspectorId: string
  component: string
  onSuccess: () => void
  onCancel: () => void
}

type UploadedMedia = {
  id: string
  storage_url: string
  thumbnail_url: string | null
}

const STATUS_OPTIONS: { value: ObservationStatus; label: string; color: string }[] = [
  { value: 'FUNCTIONAL', label: 'Functional', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'DEFICIENT', label: 'Deficient', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'MAINTENANCE_NEEDED', label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'NOT_PRESENT', label: 'Not Present', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'NOT_INSPECTED', label: 'Not Inspected', color: 'bg-blue-100 text-blue-800 border-blue-300' },
]

const SEVERITY_OPTIONS: { value: ObservationSeverity; label: string; color: string }[] = [
  { value: 'SAFETY_HAZARD', label: 'Safety Hazard', color: 'bg-red-500 text-white border-red-600' },
  { value: 'MAJOR_DEFECT', label: 'Major', color: 'bg-orange-500 text-white border-orange-600' },
  { value: 'MINOR_DEFECT', label: 'Minor', color: 'bg-yellow-500 text-black border-yellow-600' },
  { value: 'COSMETIC', label: 'Cosmetic', color: 'bg-blue-500 text-white border-blue-600' },
  { value: 'INFORMATIONAL', label: 'Info', color: 'bg-gray-500 text-white border-gray-600' },
]

export function ObservationForm({
  sectionId,
  inspectionId,
  propertyId,
  inspectorId,
  component,
  onSuccess,
  onCancel,
}: Props) {
  const [status, setStatus] = useState<ObservationStatus>('DEFICIENT')
  const [severity, setSeverity] = useState<ObservationSeverity>('MINOR_DEFECT')
  const [locationDetail, setLocationDetail] = useState('')
  const [inspectorNotes, setInspectorNotes] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggested, setAiSuggested] = useState<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const showSeverity = status === 'DEFICIENT' || status === 'MAINTENANCE_NEEDED'

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('inspector_id', inspectorId)
        formData.append('inspection_id', inspectionId)
        formData.append('property_id', propertyId)
        formData.append('section_id', sectionId)

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()
        setUploadedMedia((prev) => [...prev, data.media])
      } catch (error) {
        console.error('Upload error:', error)
        setUploadError(error instanceof Error ? error.message : 'Upload failed')
      }
    }

    setIsUploading(false)
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }

  const handleRemoveMedia = (mediaId: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId))
  }

  const handleAIAnalyze = async () => {
    if (uploadedMedia.length === 0) return

    setIsAnalyzing(true)
    try {
      // Fetch the first uploaded image to send to AI
      const firstMedia = uploadedMedia[0]
      const imageUrl = firstMedia.storage_url

      // Fetch the image as a blob
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      const formData = new FormData()
      formData.append('image', imageBlob, 'photo.jpg')

      const response = await fetch('/api/ai/analyze-photo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'AI analysis failed')
      }

      const { analysis } = (await response.json()) as { analysis: AIAnalysis }
      const suggested = new Set<string>()

      // Map AI severity to observation severity
      if (analysis.severity && AI_SEVERITY_MAP[analysis.severity]) {
        setSeverity(AI_SEVERITY_MAP[analysis.severity])
        suggested.add('severity')
      }

      // Map AI condition to observation status
      if (analysis.condition) {
        const conditionLower = analysis.condition.toLowerCase()
        let matched = false
        for (const [keyword, observationStatus] of Object.entries(AI_CONDITION_TO_STATUS)) {
          if (conditionLower.includes(keyword)) {
            setStatus(observationStatus)
            suggested.add('status')
            matched = true
            break
          }
        }
        if (!matched) {
          setStatus('DEFICIENT')
          suggested.add('status')
        }
      }

      // Build notes from AI analysis
      const noteParts: string[] = []
      if (analysis.description) noteParts.push(analysis.description)
      if (analysis.recommended_action) noteParts.push(`Recommended: ${analysis.recommended_action}`)
      if (noteParts.length > 0) {
        setInspectorNotes(noteParts.join('\n\n'))
        suggested.add('notes')
      }

      setAiSuggested(suggested)
      toast.success('AI analysis complete — review and adjust fields as needed')
    } catch (error) {
      console.error('AI analysis error:', error)
      toast.error(error instanceof Error ? error.message : 'AI analysis failed — fill in manually')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    if (uploadedMedia.length === 0) {
      setUploadError('At least one photo is required')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          component,
          status,
          severity,
          location_detail: locationDetail || null,
          inspector_notes: inspectorNotes || null,
          media_ids: uploadedMedia.map((m) => m.id),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save observation')
      }

      onSuccess()
    } catch (error) {
      console.error('Save error:', error)
      setUploadError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Photo Capture - FIRST */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Photos <span className="text-red-500">*</span>
        </Label>

        {/* Uploaded Photos */}
        {uploadedMedia.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedMedia.map((media) => (
              <div key={media.id} className="relative group">
                <img
                  src={media.thumbnail_url || media.storage_url}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(media.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload
          </Button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />

        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
      </div>

      {/* AI Analysis Button */}
      {uploadedMedia.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAIAnalyze}
          disabled={isAnalyzing || isUploading}
          className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              AI analyzing photo...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
      )}

      {/* Status Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">Status</Label>
          {aiSuggested.has('status') && (
            <Badge variant="secondary" className="text-xs font-normal">AI suggested</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                status === option.value
                  ? `${option.color} ring-2 ring-offset-1 ring-current`
                  : 'bg-muted text-muted-foreground border-muted hover:bg-muted/80'
              }`}
            >
              {status === option.value && <Check className="h-3 w-3 inline mr-1" />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity Selection (only for deficient/maintenance) */}
      {showSeverity && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Severity</Label>
            {aiSuggested.has('severity') && (
              <Badge variant="secondary" className="text-xs font-normal">AI suggested</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSeverity(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  severity === option.value
                    ? `${option.color} ring-2 ring-offset-1 ring-white/50`
                    : 'bg-muted text-muted-foreground border-muted hover:bg-muted/80'
                }`}
              >
                {severity === option.value && <Check className="h-3 w-3 inline mr-1" />}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Detail */}
      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input
          id="location"
          placeholder="e.g., North slope, Master bathroom, Garage"
          value={locationDetail}
          onChange={(e) => setLocationDetail(e.target.value)}
        />
      </div>

      {/* Inspector Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          {aiSuggested.has('notes') && (
            <Badge variant="secondary" className="text-xs font-normal">AI suggested</Badge>
          )}
        </div>
        <Textarea
          id="notes"
          placeholder="Additional observations or recommendations..."
          value={inspectorNotes}
          onChange={(e) => setInspectorNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || uploadedMedia.length === 0}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Observation'
          )}
        </Button>
      </div>
    </div>
  )
}
