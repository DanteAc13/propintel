'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROPOSAL_STATUS_DISPLAY } from '@/types/contractor'
import type { ProposalStatus } from '@prisma/client'

// TODO: Get actual user ID from session
const DEMO_USER_ID = 'demo-contractor-id'

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [proposal, setProposal] = useState<{
    id: string
    status: ProposalStatus
    total_amount: number
    notes: string | null
    estimated_start_date: string | null
    estimated_duration_days: number | null
    submitted_at: string | null
    expires_at: string
    project: {
      id: string
      title: string
      status: string
      property: {
        address_line1: string
        city: string
        state: string
        zip_code: string
      }
    }
    items: Array<{
      id: string
      line_item_cost: number
      notes: string | null
      scope_item: {
        id: string
        title: string
        description: string
        trade_category: string
      }
    }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProposal() {
      try {
        const response = await fetch(
          `/api/contractor/proposals/${proposalId}?user_id=${DEMO_USER_ID}`
        )
        if (!response.ok) throw new Error('Failed to fetch proposal')
        const data = await response.json()
        setProposal(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposal()
  }, [proposalId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <button
            onClick={() => router.push('/contractor')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error || 'Proposal not found'}
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = PROPOSAL_STATUS_DISPLAY[proposal.status]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/contractor')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={`${statusConfig.bgColor} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {proposal.project.title}
            </h1>
            <div className="flex items-center gap-1 text-gray-500 mt-1">
              <MapPin className="h-4 w-4" />
              {proposal.project.property.address_line1},{' '}
              {proposal.project.property.city}, {proposal.project.property.state}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proposal Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                ${Number(proposal.total_amount).toLocaleString()}
              </span>
            </div>

            {proposal.estimated_start_date && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Estimated Start
                </span>
                <span className="font-medium">
                  {new Date(proposal.estimated_start_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {proposal.estimated_duration_days && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </span>
                <span className="font-medium">
                  {proposal.estimated_duration_days} days
                </span>
              </div>
            )}

            {proposal.submitted_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Submitted</span>
                <span className="font-medium">
                  {new Date(proposal.submitted_at).toLocaleDateString()}
                </span>
              </div>
            )}

            {proposal.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
                <p className="text-gray-700">{proposal.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Line Items ({proposal.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposal.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {item.scope_item.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.scope_item.trade_category}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">
                    ${Number(item.line_item_cost).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
