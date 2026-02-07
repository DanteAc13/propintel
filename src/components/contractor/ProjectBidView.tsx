'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Home,
  Calendar,
  Clock,
  AlertTriangle,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { ProjectForContractor, ScopeItemForBid } from '@/types/contractor'

type ProjectBidViewProps = {
  projectId: string
  userId: string
}

type LineItemInput = {
  scope_item_id: string
  line_item_cost: number
  notes: string
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
}

function ScopeItemBidCard({
  item,
  lineItem,
  onChange,
}: {
  item: ScopeItemForBid
  lineItem: LineItemInput
  onChange: (updated: LineItemInput) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const issue = item.issue
  const photos = issue?.observation?.media ?? []

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {issue && (
                <Badge
                  variant="outline"
                  className={SEVERITY_COLORS[issue.severity_label]}
                >
                  {issue.severity_label}
                </Badge>
              )}
              <Badge variant="secondary">{item.trade_category}</Badge>
              {item.master_format_code && (
                <span className="text-xs text-gray-500">
                  {item.master_format_code}
                </span>
              )}
            </div>
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            {issue?.is_safety_hazard && (
              <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                <AlertTriangle className="h-4 w-4" />
                Safety hazard
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {photos.slice(0, 4).map((photo, idx) => (
              <div
                key={photo.id}
                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 relative"
              >
                <Image
                  src={photo.thumbnail_url ?? photo.storage_url}
                  alt={`Photo ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Expand/collapse details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-3"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show details
            </>
          )}
        </button>

        {expanded && issue && (
          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
            <div>
              <p className="font-medium text-gray-700">Description</p>
              <p className="text-gray-600">{issue.normalized_description}</p>
            </div>
            {issue.observation.location_detail && (
              <div>
                <p className="font-medium text-gray-700">Location</p>
                <p className="text-gray-600">{issue.observation.location_detail}</p>
              </div>
            )}
            {issue.observation.inspector_notes && (
              <div>
                <p className="font-medium text-gray-700">Inspector Notes</p>
                <p className="text-gray-600">{issue.observation.inspector_notes}</p>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-700">Urgency</p>
              <p className="text-gray-600">{issue.urgency}</p>
            </div>
          </div>
        )}

        {/* Pricing input */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor={`cost-${item.id}`} className="text-sm">
                Your Price ($)
              </Label>
              <Input
                id={`cost-${item.id}`}
                type="number"
                min={0}
                step={0.01}
                value={lineItem.line_item_cost || ''}
                onChange={(e) =>
                  onChange({
                    ...lineItem,
                    line_item_cost: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`notes-${item.id}`} className="text-sm">
              Notes (optional)
            </Label>
            <Textarea
              id={`notes-${item.id}`}
              value={lineItem.notes}
              onChange={(e) =>
                onChange({ ...lineItem, notes: e.target.value })
              }
              placeholder="Any additional notes about this line item..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectBidView({ projectId, userId }: ProjectBidViewProps) {
  const router = useRouter()
  const [project, setProject] = useState<ProjectForContractor | null>(null)
  const [lineItems, setLineItems] = useState<Record<string, LineItemInput>>({})
  const [proposalNotes, setProposalNotes] = useState('')
  const [estimatedStartDate, setEstimatedStartDate] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingProposalId, setExistingProposalId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(
          `/api/contractor/projects/${projectId}?user_id=${userId}`
        )
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch project')
        }
        const data = await response.json()
        setProject(data)

        // Initialize line items
        const items: Record<string, LineItemInput> = {}
        data.matchingScopeItems.forEach((item: ScopeItemForBid) => {
          items[item.id] = {
            scope_item_id: item.id,
            line_item_cost: 0,
            notes: '',
          }
        })
        setLineItems(items)

        // If there's an existing draft proposal, load it
        if (data.existingProposal) {
          setExistingProposalId(data.existingProposal.id)
          // TODO: Load existing proposal items
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [projectId, userId])

  const updateLineItem = (itemId: string, updated: LineItemInput) => {
    setLineItems((prev) => ({
      ...prev,
      [itemId]: updated,
    }))
  }

  const totalAmount = Object.values(lineItems).reduce(
    (sum, item) => sum + (item.line_item_cost || 0),
    0
  )

  const allItemsPriced = Object.values(lineItems).every(
    (item) => item.line_item_cost > 0
  )

  const handleSaveDraft = async () => {
    if (!project?.latestSnapshot) return
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/contractor/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          scope_snapshot_id: project.latestSnapshot.id,
          contractor_id: userId,
          items: Object.values(lineItems).filter((item) => item.line_item_cost > 0),
          notes: proposalNotes || undefined,
          estimated_start_date: estimatedStartDate || undefined,
          estimated_duration_days: estimatedDuration || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.proposalId) {
          setExistingProposalId(data.proposalId)
        }
        throw new Error(data.error || 'Failed to save draft')
      }

      const proposal = await response.json()
      setExistingProposalId(proposal.id)
      router.push('/contractor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!project?.latestSnapshot) return
    setIsSubmitting(true)
    setError(null)

    try {
      // First create/update the proposal
      let proposalId = existingProposalId

      if (!proposalId) {
        const createRes = await fetch('/api/contractor/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            scope_snapshot_id: project.latestSnapshot.id,
            contractor_id: userId,
            items: Object.values(lineItems),
            notes: proposalNotes || undefined,
            estimated_start_date: estimatedStartDate || undefined,
            estimated_duration_days: estimatedDuration || undefined,
          }),
        })

        if (!createRes.ok) {
          const data = await createRes.json()
          throw new Error(data.error || 'Failed to create proposal')
        }

        const proposal = await createRes.json()
        proposalId = proposal.id
      }

      // Then submit it
      const submitRes = await fetch(
        `/api/contractor/proposals/${proposalId}/submit`,
        { method: 'POST' }
      )

      if (!submitRes.ok) {
        const data = await submitRes.json()
        throw new Error(data.error || 'Failed to submit proposal')
      }

      router.push('/contractor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/contractor')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/contractor')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      {/* Project header */}
      <Card>
        <CardContent className="p-4">
          <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
          <div className="flex items-center gap-1 text-gray-500 mt-1">
            <MapPin className="h-4 w-4" />
            {project.property.address_line1}, {project.property.city},{' '}
            {project.property.state} {project.property.zip_code}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
            {project.property.year_built && (
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Built {project.property.year_built}
              </div>
            )}
            {project.property.square_footage && (
              <div>
                {project.property.square_footage.toLocaleString()} sq ft
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Scope items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Scope Items ({project.matchingScopeItems.length})
        </h2>
        <div className="space-y-4">
          {project.matchingScopeItems.map((item) => (
            <ScopeItemBidCard
              key={item.id}
              item={item}
              lineItem={lineItems[item.id]}
              onChange={(updated) => updateLineItem(item.id, updated)}
            />
          ))}
        </div>
      </div>

      {/* Proposal details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proposal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Estimated Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={estimatedStartDate}
                onChange={(e) => setEstimatedStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={estimatedDuration}
                onChange={(e) =>
                  setEstimatedDuration(
                    e.target.value ? parseInt(e.target.value) : ''
                  )
                }
                placeholder="e.g., 5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
              placeholder="Any additional information for the homeowner..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary and actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Proposal Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            {!allItemsPriced && (
              <p className="text-sm text-amber-600">
                All items must have a price to submit
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!allItemsPriced || isSaving || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Proposal
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Proposal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once submitted, your proposal will be sent to the homeowner for
                    review. You won&apos;t be able to edit it after submission.
                    <br />
                    <br />
                    <strong>Total: ${totalAmount.toLocaleString()}</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    Submit Proposal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
