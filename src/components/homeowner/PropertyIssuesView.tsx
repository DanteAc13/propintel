'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Home,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IssueCard } from './IssueCard'
import { IssueSectionHeader } from './IssueSectionHeader'
import type { PropertyIssuesResponse, IssueForHomeowner } from '@/types/homeowner'
import type { Property } from '@prisma/client'

type PropertyIssuesViewProps = {
  propertyId: string
  userId: string
}

export function PropertyIssuesView({ propertyId, userId }: PropertyIssuesViewProps) {
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [issuesData, setIssuesData] = useState<PropertyIssuesResponse | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch property and issues
  useEffect(() => {
    async function fetchData() {
      try {
        const [propRes, issuesRes] = await Promise.all([
          fetch(`/api/properties/${propertyId}`),
          fetch(`/api/properties/${propertyId}/issues`),
        ])

        if (!propRes.ok || !issuesRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const propData = await propRes.json()
        const issuesData = await issuesRes.json()

        setProperty(propData)
        setIssuesData(issuesData)

        // Pre-select issues that are already in scope (not suppressed)
        const preSelected = new Set<string>()
        issuesData.issues.forEach((issue: IssueForHomeowner) => {
          const scopeItem = issue.scope_items?.[0]
          if (scopeItem && !scopeItem.is_suppressed) {
            preSelected.add(issue.id)
          }
        })
        setSelectedIssues(preSelected)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [propertyId])

  // Toggle issue selection
  const handleToggle = useCallback(async (issueId: string, selected: boolean) => {
    if (!issuesData?.activeProject) {
      // Need to create a project first - redirect to scope review
      return
    }

    setSelectedIssues((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(issueId)
      } else {
        next.delete(issueId)
      }
      return next
    })

    // Find the issue
    const issue = issuesData.issues.find((i) => i.id === issueId)
    if (!issue) return

    const scopeItem = issue.scope_items?.[0]

    try {
      if (scopeItem) {
        // Update existing scope item
        await fetch(`/api/scope-items/${scopeItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_suppressed: !selected }),
        })
      } else if (selected) {
        // Create new scope item
        await fetch('/api/scope-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: issuesData.activeProject.id,
            issue_id: issueId,
            title: issue.normalized_title,
            description: issue.homeowner_description,
            trade_category: issue.trade_category,
            master_format_code: issue.master_format_code,
          }),
        })
      }
    } catch (err) {
      console.error('Failed to update scope item:', err)
      // Revert selection on error
      setSelectedIssues((prev) => {
        const next = new Set(prev)
        if (selected) {
          next.delete(issueId)
        } else {
          next.add(issueId)
        }
        return next
      })
    }
  }, [issuesData])

  // Start a new project
  const handleStartProject = async () => {
    if (!property) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          owner_id: userId,
          title: `${property.address_line1} Project`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.existingProjectId) {
          // Project already exists, redirect to it
          router.push(`/homeowner/projects/${data.existingProjectId}`)
          return
        }
        throw new Error(data.error || 'Failed to create project')
      }

      const project = await response.json()
      router.push(`/homeowner/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !property || !issuesData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Failed to load property data'}
      </div>
    )
  }

  const { grouped, activeProject, inspectionDate } = issuesData
  const totalIssues = issuesData.issues.length
  const hasIssues = totalIssues > 0

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/homeowner')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to properties
      </button>

      {/* Property header */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Home className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {property.address_line1}
            </h1>
            <p className="text-gray-500">
              {property.city}, {property.state} {property.zip_code}
            </p>
            {inspectionDate && (
              <p className="text-sm text-gray-400 mt-1">
                Inspected {new Date(inspectionDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* No issues state */}
      {!hasIssues && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              Great news! No issues found
            </h3>
            <p className="text-gray-500 mt-1">
              Your property passed the inspection with no deficiencies
            </p>
          </CardContent>
        </Card>
      )}

      {/* Issues by severity */}
      {hasIssues && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found during inspection.
                Select the items you want to fix, then proceed to get quotes from contractors.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-sm text-gray-500">
                  {selectedIssues.size} of {totalIssues} selected
                </span>
                {activeProject ? (
                  <Button
                    onClick={() => router.push(`/homeowner/projects/${activeProject.id}`)}
                    className="ml-auto"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Review Scope
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartProject}
                    disabled={selectedIssues.size === 0 || isSaving}
                    className="ml-auto"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardList className="h-4 w-4 mr-2" />
                    )}
                    Start Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Safety issues */}
          {grouped.safety.length > 0 && (
            <div>
              <IssueSectionHeader type="safety" count={grouped.safety.length} />
              <div className="space-y-3">
                {grouped.safety.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssues.has(issue.id)}
                    onToggle={handleToggle}
                    disabled={!!activeProject && activeProject.status !== 'DRAFT'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Major issues */}
          {grouped.major.length > 0 && (
            <div>
              <IssueSectionHeader type="major" count={grouped.major.length} />
              <div className="space-y-3">
                {grouped.major.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssues.has(issue.id)}
                    onToggle={handleToggle}
                    disabled={!!activeProject && activeProject.status !== 'DRAFT'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Minor issues */}
          {grouped.minor.length > 0 && (
            <div>
              <IssueSectionHeader type="minor" count={grouped.minor.length} />
              <div className="space-y-3">
                {grouped.minor.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssues.has(issue.id)}
                    onToggle={handleToggle}
                    disabled={!!activeProject && activeProject.status !== 'DRAFT'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cosmetic issues */}
          {grouped.cosmetic.length > 0 && (
            <div>
              <IssueSectionHeader type="cosmetic" count={grouped.cosmetic.length} />
              <div className="space-y-3">
                {grouped.cosmetic.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIssues.has(issue.id)}
                    onToggle={handleToggle}
                    disabled={!!activeProject && activeProject.status !== 'DRAFT'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
