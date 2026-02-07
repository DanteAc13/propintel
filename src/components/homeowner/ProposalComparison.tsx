'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Building,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type ProposalItem = {
  id: string
  scopeItemId: string
  title: string
  tradeCategory: string
  cost: number
  notes: string | null
}

type ProposalForComparison = {
  id: string
  status: string
  totalAmount: number
  notes: string | null
  estimatedStartDate: string | null
  estimatedDurationDays: number | null
  submittedAt: string | null
  expiresAt: string
  contractor: {
    id: string
    name: string
    companyName: string
    yearsExperience: number | null
    trades: string[]
  }
  items: ProposalItem[]
}

type ProposalComparisonProps = {
  projectId: string
  userId: string
}

function ProposalCard({
  proposal,
  isSelected,
  onSelect,
  disabled,
}: {
  proposal: ProposalForComparison
  isSelected: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className={`transition-all ${
        proposal.status === 'ACCEPTED'
          ? 'ring-2 ring-green-500 bg-green-50/30'
          : proposal.status === 'REJECTED'
          ? 'opacity-60'
          : ''
      }`}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {proposal.status === 'ACCEPTED' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
              {proposal.status === 'REJECTED' && (
                <Badge variant="outline">Not Selected</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">
                {proposal.contractor.companyName}
              </h3>
            </div>
            <p className="text-sm text-gray-500">{proposal.contractor.name}</p>
            {proposal.contractor.yearsExperience && (
              <p className="text-xs text-gray-400 mt-1">
                {proposal.contractor.yearsExperience} years experience
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${proposal.totalAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
          {proposal.estimatedStartDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Starts{' '}
              {new Date(proposal.estimatedStartDate).toLocaleDateString()}
            </div>
          )}
          {proposal.estimatedDurationDays && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {proposal.estimatedDurationDays} days
            </div>
          )}
        </div>

        {/* Trades */}
        <div className="flex flex-wrap gap-1 mt-3">
          {proposal.contractor.trades.map((trade) => (
            <Badge key={trade} variant="secondary" className="text-xs">
              {trade}
            </Badge>
          ))}
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{proposal.notes}</p>
          </div>
        )}

        {/* Line items toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-4 w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide breakdown
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show breakdown ({proposal.items.length} items)
            </>
          )}
        </button>

        {/* Line items */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {proposal.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">{item.tradeCategory}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-600 mt-1">{item.notes}</p>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  ${item.cost.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Select button */}
        {proposal.status === 'SUBMITTED' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full mt-4" disabled={disabled}>
                <Award className="h-4 w-4 mr-2" />
                Select This Contractor
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Select {proposal.contractor.companyName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;re about to select this contractor for your project. Their
                  proposal of ${proposal.totalAmount.toLocaleString()} will be
                  accepted, and all other proposals will be declined.
                  <br />
                  <br />
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onSelect}>
                  Yes, Select Contractor
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}

export function ProposalComparison({ projectId, userId }: ProposalComparisonProps) {
  const router = useRouter()
  const [proposals, setProposals] = useState<ProposalForComparison[]>([])
  const [project, setProject] = useState<{
    id: string
    title: string
    status: string
    property: { address_line1: string; city: string; state: string }
    scopeItemCount: number
  } | null>(null)
  const [hasAcceptedProposal, setHasAcceptedProposal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProposals() {
      try {
        const response = await fetch(`/api/projects/${projectId}/proposals`)
        if (!response.ok) throw new Error('Failed to fetch proposals')
        const data = await response.json()
        setProject(data.project)
        setProposals(data.proposals)
        setHasAcceptedProposal(data.hasAcceptedProposal)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposals()
  }, [projectId])

  const handleSelectContractor = async (proposalId: string) => {
    setIsSelecting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/select-contractor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          owner_id: userId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to select contractor')
      }

      // Refresh data
      const refreshRes = await fetch(`/api/projects/${projectId}/proposals`)
      const refreshData = await refreshRes.json()
      setProject(refreshData.project)
      setProposals(refreshData.proposals)
      setHasAcceptedProposal(refreshData.hasAcceptedProposal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select contractor')
    } finally {
      setIsSelecting(false)
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
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    )
  }

  const submittedProposals = proposals.filter((p) => p.status === 'SUBMITTED')
  const lowestBid = submittedProposals.length > 0
    ? Math.min(...submittedProposals.map((p) => p.totalAmount))
    : null

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push(`/homeowner/projects/${projectId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Proposals</h1>
        {project && (
          <p className="text-gray-500 mt-1">
            {project.property.address_line1}, {project.property.city}
          </p>
        )}
      </div>

      {/* Summary */}
      {submittedProposals.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}{' '}
                  received
                </p>
                {lowestBid && (
                  <p className="text-lg font-semibold text-gray-900">
                    Starting at ${lowestBid.toLocaleString()}
                  </p>
                )}
              </div>
              {hasAcceptedProposal && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Contractor Selected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* No proposals */}
      {proposals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              Waiting for proposals
            </h3>
            <p className="text-gray-500 mt-1">
              Contractors are reviewing your project. You&apos;ll be notified when
              proposals come in.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Proposals list */}
      {proposals.length > 0 && (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isSelected={proposal.status === 'ACCEPTED'}
              onSelect={() => handleSelectContractor(proposal.id)}
              disabled={isSelecting || hasAcceptedProposal}
            />
          ))}
        </div>
      )}
    </div>
  )
}
