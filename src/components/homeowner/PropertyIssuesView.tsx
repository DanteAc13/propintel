'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  ClipboardList,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Paintbrush,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      let res: Response
      if (scopeItem) {
        // Update existing scope item
        res = await fetch(`/api/scope-items/${scopeItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_suppressed: !selected }),
        })
      } else if (selected) {
        // Create new scope item
        res = await fetch('/api/scope-items', {
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
      } else {
        return
      }
      if (!res.ok) throw new Error(`Server responded ${res.status}`)
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
      {/* Back + Print buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/homeowner')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </button>
        {hasIssues && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/homeowner/property/${propertyId}/report`, '_blank')}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        )}
      </div>

      {/* Professional property header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium uppercase tracking-wide mb-1">Property Assessment</p>
              <h1 className="text-2xl font-bold">{property.address_line1}</h1>
              <p className="text-slate-300 mt-1">
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>
            <div className="text-right">
              {inspectionDate && (
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Inspected</p>
                  <p className="text-white font-medium">
                    {new Date(inspectionDate).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Severity summary bar */}
        {hasIssues && (
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { key: 'safety' as const, icon: AlertTriangle, label: 'Safety', color: 'text-red-600', bg: 'bg-red-50' },
              { key: 'major' as const, icon: AlertCircle, label: 'Major', color: 'text-orange-600', bg: 'bg-orange-50' },
              { key: 'minor' as const, icon: Info, label: 'Minor', color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { key: 'cosmetic' as const, icon: Paintbrush, label: 'Cosmetic', color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(({ key, icon: Icon, label, color, bg }) => (
              <div key={key} className={`p-4 text-center ${grouped[key].length > 0 ? bg : ''}`}>
                <Icon className={`h-5 w-5 mx-auto mb-1 ${grouped[key].length > 0 ? color : 'text-gray-300'}`} />
                <p className={`text-2xl font-bold ${grouped[key].length > 0 ? color : 'text-gray-300'}`}>
                  {grouped[key].length}
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* No issues state */}
      {!hasIssues && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              No Issues Found
            </h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Your property passed the inspection with no deficiencies noted.
              This is a great sign for your home&apos;s condition.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Issues by severity */}
      {hasIssues && (
        <>
          {/* Action card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What&apos;s Next?</CardTitle>
              <CardDescription>
                Review the findings below. Select which items you&apos;d like fixed,
                then request quotes from qualified contractors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">
                    {selectedIssues.size} of {totalIssues} selected
                  </Badge>
                  {grouped.safety.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {grouped.safety.length} safety item{grouped.safety.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {activeProject ? (
                  <Button
                    onClick={() => router.push(`/homeowner/projects/${activeProject.id}`)}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Review Scope
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartProject}
                    disabled={selectedIssues.size === 0 || isSaving}
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
