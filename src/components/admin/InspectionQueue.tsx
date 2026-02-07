'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  UserPlus,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type {
  InspectionQueueResponse,
  InspectionForAdmin,
  AvailableInspector,
} from '@/types/admin'
import { INSPECTION_STATUS_DISPLAY } from '@/types/admin'

type QueueType = 'assignment' | 'review' | 'all'

export function InspectionQueue() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQueue = (searchParams.get('queue') as QueueType) || 'all'

  const [queue, setQueue] = useState<QueueType>(initialQueue)
  const [data, setData] = useState<InspectionQueueResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action dialogs
  const [assignDialog, setAssignDialog] = useState<{
    inspection: InspectionForAdmin
    inspectorId: string
  } | null>(null)
  const [reviewDialog, setReviewDialog] = useState<{
    inspection: InspectionForAdmin
    action: 'approve' | 'reject'
    notes: string
  } | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  useEffect(() => {
    async function fetchInspections() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/inspections?queue=${queue}`)
        if (!response.ok) throw new Error('Failed to fetch inspections')
        const data = await response.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInspections()
  }, [queue])

  const handleAssign = async () => {
    if (!assignDialog) return
    setIsActioning(true)

    try {
      const response = await fetch(
        `/api/admin/inspections/${assignDialog.inspection.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign',
            inspector_id: assignDialog.inspectorId,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to assign inspector')

      // Refresh data
      setAssignDialog(null)
      const refreshResponse = await fetch(`/api/admin/inspections?queue=${queue}`)
      setData(await refreshResponse.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setIsActioning(false)
    }
  }

  const handleReview = async () => {
    if (!reviewDialog) return
    setIsActioning(true)

    try {
      const response = await fetch(
        `/api/admin/inspections/${reviewDialog.inspection.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: reviewDialog.action,
            rejection_notes: reviewDialog.notes,
          }),
        }
      )

      if (!response.ok) throw new Error(`Failed to ${reviewDialog.action}`)

      // Refresh data
      setReviewDialog(null)
      const refreshResponse = await fetch(`/api/admin/inspections?queue=${queue}`)
      setData(await refreshResponse.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsActioning(false)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/admin')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
          <p className="text-gray-500 mt-1">
            {data?.total ?? 0} inspection{data?.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={queue} onValueChange={(v) => setQueue(v as QueueType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inspections</SelectItem>
            <SelectItem value="assignment">Needs Assignment</SelectItem>
            <SelectItem value="review">Needs Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Inspection list */}
      {data?.inspections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">No inspections in this queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.inspections.map((inspection) => {
            const statusConfig = INSPECTION_STATUS_DISPLAY[inspection.status]

            return (
              <Card key={inspection.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Property info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                        {inspection._count.issues > 0 && (
                          <Badge variant="secondary">
                            {inspection._count.issues} issues
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {inspection.property.address_line1}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin className="h-3 w-3" />
                        {inspection.property.city}, {inspection.property.state}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(inspection.scheduled_date)}
                      </div>
                      {inspection.property.owner && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <User className="h-3 w-3" />
                          {inspection.property.owner.first_name}{' '}
                          {inspection.property.owner.last_name}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {inspection.status === 'SCHEDULED' &&
                        !inspection.inspector_id && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setAssignDialog({
                                inspection,
                                inspectorId: '',
                              })
                            }
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}

                      {inspection.status === 'IN_REVIEW' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              setReviewDialog({
                                inspection,
                                action: 'approve',
                                notes: '',
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setReviewDialog({
                                inspection,
                                action: 'reject',
                                notes: '',
                              })
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {inspection.inspector && (
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          {inspection.inspector.first_name}{' '}
                          {inspection.inspector.last_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog
        open={!!assignDialog}
        onOpenChange={(open) => !open && setAssignDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Inspector</DialogTitle>
            <DialogDescription>
              Select an inspector to assign to this inspection at{' '}
              {assignDialog?.inspection.property.address_line1}
            </DialogDescription>
          </DialogHeader>

          <Select
            value={assignDialog?.inspectorId || ''}
            onValueChange={(v) =>
              assignDialog && setAssignDialog({ ...assignDialog, inspectorId: v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an inspector" />
            </SelectTrigger>
            <SelectContent>
              {data?.availableInspectors?.map((inspector) => (
                <SelectItem key={inspector.id} value={inspector.id}>
                  {inspector.first_name} {inspector.last_name} (
                  {inspector.active_inspections} active)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignDialog?.inspectorId || isActioning}
            >
              {isActioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewDialog}
        onOpenChange={(open) => !open && setReviewDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === 'approve'
                ? 'Approve Inspection'
                : 'Reject Inspection'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === 'approve'
                ? 'Confirm that this inspection meets quality standards.'
                : 'Provide a reason for rejection. The inspector will be notified.'}
            </DialogDescription>
          </DialogHeader>

          {reviewDialog?.action === 'reject' && (
            <Textarea
              placeholder="Rejection reason..."
              value={reviewDialog.notes}
              onChange={(e) =>
                setReviewDialog({ ...reviewDialog, notes: e.target.value })
              }
              rows={3}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewDialog?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={
                isActioning ||
                (reviewDialog?.action === 'reject' && !reviewDialog.notes)
              }
            >
              {isActioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewDialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
