'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  Lock,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { ProjectWithScope, ScopeItemWithIssue } from '@/types/homeowner'

type ScopeReviewProps = {
  projectId: string
}

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
}

function ScopeItemCard({
  item,
  onToggle,
  disabled,
}: {
  item: ScopeItemWithIssue
  onToggle: (id: string, suppressed: boolean) => void
  disabled: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const issue = item.issue
  const photos = issue?.observation?.media ?? []

  return (
    <Card className={`${item.is_suppressed ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {issue && (
                <Badge
                  variant="outline"
                  className={SEVERITY_COLORS[issue.severity_label]}
                >
                  {issue.severity_label}
                </Badge>
              )}
              {item.is_homeowner_added && (
                <Badge variant="secondary">Added by you</Badge>
              )}
            </div>
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              Trade: {item.trade_category}
            </p>
          </div>

          {!disabled && (
            <Button
              variant={item.is_suppressed ? 'outline' : 'default'}
              size="sm"
              onClick={() => onToggle(item.id, !item.is_suppressed)}
              className="flex-shrink-0"
            >
              {item.is_suppressed ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Include
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </>
              )}
            </Button>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {photos.slice(0, 4).map((photo, idx) => (
              <div
                key={photo.id}
                className="flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-gray-100 relative"
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

        {/* Expand for more details */}
        {issue && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-2"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Details
                </>
              )}
            </button>

            {expanded && (
              <div className="mt-2 pt-2 border-t text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Urgency:</span>{' '}
                  {issue.urgency === 'IMMEDIATE' && 'Fix immediately'}
                  {issue.urgency === 'SHORT_TERM' && 'Fix soon'}
                  {issue.urgency === 'LONG_TERM' && 'Can wait'}
                  {issue.urgency === 'MONITOR' && 'Monitor only'}
                </p>
                {issue.is_safety_hazard && (
                  <p className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Safety hazard
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function ScopeReview({ projectId }: ScopeReviewProps) {
  const router = useRouter()
  const [project, setProject] = useState<ProjectWithScope | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        setProject(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  const handleToggle = async (itemId: string, suppressed: boolean) => {
    if (!project) return

    try {
      await fetch(`/api/scope-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_suppressed: suppressed }),
      })

      // Update local state
      setProject({
        ...project,
        scope_items: project.scope_items.map((item) =>
          item.id === itemId ? { ...item, is_suppressed: suppressed } : item
        ),
      })
    } catch (err) {
      console.error('Failed to update scope item:', err)
    }
  }

  const handleLockScope = async () => {
    setIsLocking(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/lock-scope`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to lock scope')
      }

      // Refresh project data
      const projectRes = await fetch(`/api/projects/${projectId}`)
      const projectData = await projectRes.json()
      setProject(projectData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock scope')
    } finally {
      setIsLocking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'Failed to load project'}
      </div>
    )
  }

  const activeItems = project.scope_items.filter((i) => !i.is_suppressed)
  const suppressedItems = project.scope_items.filter((i) => i.is_suppressed)
  const isLocked = project.status !== 'DRAFT'
  const canLock = activeItems.length > 0 && !isLocked

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push(`/homeowner/properties/${project.property_id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to property
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
        <p className="text-gray-500">
          {project.property.address_line1}, {project.property.city}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={isLocked ? 'default' : 'outline'}>
            {project.status.replace('_', ' ')}
          </Badge>
          {project.scope_locked_at && (
            <span className="text-sm text-gray-500">
              Locked {new Date(project.scope_locked_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scope Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {activeItems.length}
              </p>
              <p className="text-gray-500">items to fix</p>
            </div>
            {suppressedItems.length > 0 && (
              <div className="text-right">
                <p className="text-xl font-medium text-gray-400">
                  {suppressedItems.length}
                </p>
                <p className="text-sm text-gray-400">deferred</p>
              </div>
            )}
          </div>

          {!isLocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full mt-4"
                  disabled={!canLock || isLocking}
                >
                  {isLocking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Lock Scope & Get Quotes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lock your scope?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once locked, your scope will be sent to qualified contractors
                    for quotes. You won&apos;t be able to modify the items included.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLockScope}>
                    Yes, Lock Scope
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isLocked && project.proposals.length === 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Your scope is locked and ready for contractor quotes.
              You&apos;ll be notified when proposals come in.
            </div>
          )}

          {project.proposals.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-700">
                {project.proposals.length} proposal{project.proposals.length !== 1 ? 's' : ''} received
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => router.push(`/homeowner/projects/${projectId}/proposals`)}
              >
                View Proposals
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active items */}
      {activeItems.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Items to Fix ({activeItems.length})
          </h2>
          <div className="space-y-3">
            {activeItems.map((item) => (
              <ScopeItemCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                disabled={isLocked}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suppressed items */}
      {suppressedItems.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-400 mb-3">
            Deferred Items ({suppressedItems.length})
          </h2>
          <div className="space-y-3">
            {suppressedItems.map((item) => (
              <ScopeItemCard
                key={item.id}
                item={item}
                onToggle={handleToggle}
                disabled={isLocked}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
