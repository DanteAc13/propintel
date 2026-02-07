'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Building,
  Mail,
  Phone,
  Award,
  Ban,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import type { ContractorQueueResponse, ContractorForAdmin } from '@/types/admin'
import { CONTRACTOR_STATUS_DISPLAY } from '@/types/admin'

type StatusFilter = 'all' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'

export function ContractorQueue() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = (searchParams.get('status') as StatusFilter) || 'all'

  const [status, setStatus] = useState<StatusFilter>(initialStatus)
  const [data, setData] = useState<ContractorQueueResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    contractor: ContractorForAdmin
    action: 'approve' | 'reject' | 'suspend' | 'reactivate'
  } | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  useEffect(() => {
    async function fetchContractors() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/admin/contractors?status=${status}`)
        if (!response.ok) throw new Error('Failed to fetch contractors')
        const data = await response.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContractors()
  }, [status])

  const handleAction = async () => {
    if (!actionDialog) return
    setIsActioning(true)

    try {
      const response = await fetch(
        `/api/admin/contractors/${actionDialog.contractor.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionDialog.action }),
        }
      )

      if (!response.ok) throw new Error('Action failed')

      // Refresh data
      setActionDialog(null)
      const refreshResponse = await fetch(`/api/admin/contractors?status=${status}`)
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
          <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
          <p className="text-gray-500 mt-1">
            {data?.total ?? 0} contractor{data?.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contractors</SelectItem>
            <SelectItem value="PENDING">Pending Verification</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Contractor list */}
      {data?.contractors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">No contractors in this queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.contractors.map((contractor) => {
            const statusConfig = CONTRACTOR_STATUS_DISPLAY[contractor.status]

            return (
              <Card key={contractor.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Contractor info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {contractor.company_name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Building className="h-3 w-3" />
                        {contractor.user.first_name} {contractor.user.last_name}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        {contractor.user.email}
                      </div>
                      {contractor.user.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="h-3 w-3" />
                          {contractor.user.phone}
                        </div>
                      )}
                      {contractor.trade_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contractor.trade_categories.map((trade) => (
                            <Badge key={trade} variant="secondary" className="text-xs">
                              {trade}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Applied {formatDate(contractor.user.created_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {contractor.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              setActionDialog({ contractor, action: 'approve' })
                            }
                          >
                            <Award className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              setActionDialog({ contractor, action: 'reject' })
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {contractor.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActionDialog({ contractor, action: 'suspend' })
                          }
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      )}

                      {contractor.status === 'SUSPENDED' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setActionDialog({ contractor, action: 'reactivate' })
                          }
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}

                      {contractor.verified_by && (
                        <Badge variant="outline" className="text-xs">
                          Verified by {contractor.verified_by.first_name}
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

      {/* Action Dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'approve' && 'Approve Contractor'}
              {actionDialog?.action === 'reject' && 'Reject Contractor'}
              {actionDialog?.action === 'suspend' && 'Suspend Contractor'}
              {actionDialog?.action === 'reactivate' && 'Reactivate Contractor'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'approve' &&
                `Approve ${actionDialog.contractor.company_name} to start receiving project invitations.`}
              {actionDialog?.action === 'reject' &&
                `Reject the application from ${actionDialog?.contractor.company_name}. They will be notified.`}
              {actionDialog?.action === 'suspend' &&
                `Suspend ${actionDialog?.contractor.company_name}. They will not be able to submit proposals.`}
              {actionDialog?.action === 'reactivate' &&
                `Reactivate ${actionDialog?.contractor.company_name}. They will be able to submit proposals again.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={
                actionDialog?.action === 'reject' || actionDialog?.action === 'suspend'
                  ? 'destructive'
                  : 'default'
              }
              onClick={handleAction}
              disabled={isActioning}
            >
              {isActioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog?.action === 'approve' && 'Approve'}
              {actionDialog?.action === 'reject' && 'Reject'}
              {actionDialog?.action === 'suspend' && 'Suspend'}
              {actionDialog?.action === 'reactivate' && 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
