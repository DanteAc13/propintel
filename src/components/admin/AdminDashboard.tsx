'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ClipboardCheck,
  FileSearch,
  UserCheck,
  Users,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react'
import { StatsCard } from './StatsCard'
import type { AdminStats } from '@/types/admin'

export function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Failed to load stats'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of platform activity and pending actions
        </p>
      </div>

      {/* Action required section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Action Required
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Pending Assignment"
            value={stats.inspections.pendingAssignment}
            subtitle="Inspections need inspectors"
            icon={ClipboardCheck}
            color={stats.inspections.pendingAssignment > 0 ? 'amber' : 'default'}
            onClick={() => router.push('/admin/inspections?queue=assignment')}
          />
          <StatsCard
            title="Needs Review"
            value={stats.inspections.needsReview}
            subtitle="Completed inspections"
            icon={FileSearch}
            color={stats.inspections.needsReview > 0 ? 'amber' : 'default'}
            onClick={() => router.push('/admin/inspections?queue=review')}
          />
          <StatsCard
            title="Contractor Verification"
            value={stats.contractors.pendingVerification}
            subtitle="Pending applications"
            icon={UserCheck}
            color={stats.contractors.pendingVerification > 0 ? 'amber' : 'default'}
            onClick={() => router.push('/admin/contractors?status=PENDING')}
          />
        </div>
      </div>

      {/* Overview section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Platform Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.users.total}
            subtitle={`${stats.users.byRole.homeowner || 0} homeowners, ${stats.users.byRole.inspector || 0} inspectors`}
            icon={Users}
            onClick={() => router.push('/admin/users')}
          />
          <StatsCard
            title="Active Contractors"
            value={stats.contractors.active}
            icon={UserCheck}
            color="green"
            onClick={() => router.push('/admin/contractors?status=ACTIVE')}
          />
          <StatsCard
            title="Active Projects"
            value={stats.projects.active}
            icon={FolderOpen}
            color="blue"
          />
          <StatsCard
            title="Issues (30 days)"
            value={stats.activity.issuesLast30Days}
            subtitle="Generated from inspections"
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => router.push('/admin/inspections')}
          className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-center"
        >
          <ClipboardCheck className="h-6 w-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">All Inspections</p>
        </button>
        <button
          onClick={() => router.push('/admin/contractors')}
          className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-center"
        >
          <UserCheck className="h-6 w-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">All Contractors</p>
        </button>
        <button
          onClick={() => router.push('/admin/users')}
          className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-center"
        >
          <Users className="h-6 w-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">User Management</p>
        </button>
        <button
          onClick={() => router.push('/admin/users?role=INSPECTOR')}
          className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-center"
        >
          <FileSearch className="h-6 w-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">Inspectors</p>
        </button>
      </div>
    </div>
  )
}
