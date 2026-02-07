'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  FolderOpen,
  FileText,
  Award,
  MapPin,
  ChevronRight,
  AlertCircle,
  Building,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/admin/StatsCard'
import type { AvailableProject, ProposalListItem, ContractorStats } from '@/types/contractor'
import { PROPOSAL_STATUS_DISPLAY, CONTRACTOR_STATUS_DISPLAY } from '@/types/contractor'
import type { ContractorAccountStatus, ProposalStatus } from '@prisma/client'

type ContractorDashboardProps = {
  userId: string
}

export function ContractorDashboard({ userId }: ContractorDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<ContractorStats & { accountStatus: ContractorAccountStatus } | null>(null)
  const [projects, setProjects] = useState<AvailableProject[]>([])
  const [proposals, setProposals] = useState<ProposalListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, projectsRes, proposalsRes] = await Promise.all([
          fetch(`/api/contractor/stats?user_id=${userId}`),
          fetch(`/api/contractor/projects?user_id=${userId}`),
          fetch(`/api/contractor/proposals?user_id=${userId}`),
        ])

        if (!statsRes.ok) {
          if (statsRes.status === 404) {
            // No profile, redirect to profile page
            router.push('/contractor/profile')
            return
          }
          throw new Error('Failed to fetch data')
        }

        const statsData = await statsRes.json()
        setStats(statsData)

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData.projects || [])
        }

        if (proposalsRes.ok) {
          const proposalsData = await proposalsRes.json()
          setProposals(proposalsData || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    )
  }

  const isPending = stats?.accountStatus === 'PENDING'
  const isActive = stats?.accountStatus === 'ACTIVE'
  const statusConfig = stats?.accountStatus
    ? CONTRACTOR_STATUS_DISPLAY[stats.accountStatus]
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage your projects and proposals
          </p>
        </div>
        <Link href="/contractor/profile">
          <Button variant="outline">
            <Building className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Status Banner */}
      {statusConfig && !isActive && (
        <div className={`p-4 rounded-lg ${statusConfig.bgColor} border`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 ${statusConfig.color} mt-0.5`} />
            <div>
              <p className={`font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {statusConfig.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Available Projects"
          value={stats?.availableProjects ?? 0}
          icon={FolderOpen}
          color={isActive && (stats?.availableProjects ?? 0) > 0 ? 'blue' : 'default'}
        />
        <StatsCard
          title="Active Bids"
          value={stats?.activeBids ?? 0}
          icon={FileText}
          color={(stats?.activeBids ?? 0) > 0 ? 'amber' : 'default'}
        />
        <StatsCard
          title="Won Projects"
          value={stats?.wonProjects ?? 0}
          icon={Award}
          color={(stats?.wonProjects ?? 0) > 0 ? 'green' : 'default'}
        />
      </div>

      {/* Available Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {!isActive ? (
            <p className="text-gray-500 text-center py-4">
              Your account must be verified to view available projects
            </p>
          ) : projects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No projects matching your trades are currently available
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/contractor/projects/${project.id}`}
                  className="block"
                >
                  <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {project.property.address_line1}, {project.property.city}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            {project.matchingItemsCount} items for you
                          </Badge>
                          <span className="text-xs text-gray-400">
                            of {project.totalItemsCount} total
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Proposals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              You haven&apos;t submitted any proposals yet
            </p>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => {
                const statusConfig = PROPOSAL_STATUS_DISPLAY[proposal.status as ProposalStatus]

                return (
                  <Link
                    key={proposal.id}
                    href={`/contractor/proposals/${proposal.id}`}
                    className="block"
                  >
                    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
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
                            {proposal.project.title}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {proposal.project.property.address_line1},{' '}
                            {proposal.project.property.city}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="font-medium text-gray-900">
                              ${Number(proposal.total_amount).toLocaleString()}
                            </span>
                            <span className="text-gray-500">
                              {proposal.itemCount} items
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
