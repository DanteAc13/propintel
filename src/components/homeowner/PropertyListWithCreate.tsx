'use client'

import { useEffect, useState } from 'react'
import { Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddPropertyDialog } from './AddPropertyDialog'

type PropertySummary = {
  id: string
  address_line1: string
  city: string
  state: string
  zip_code: string
  has_pool: boolean
  issueCount: number
  lastInspectionDate: string | null
  hasActiveProject: boolean
  projectStatus: string | null
  inspections: Array<{ id: string; status: string; completed_at: string | null }>
  _count?: { projects: number }
  projects?: Array<{ status: string }>
}

export function PropertyListWithCreate() {
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function fetchProperties() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/properties')
        if (!response.ok) throw new Error('Failed to fetch properties')
        const data = await response.json()
        setProperties(data.data || data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [refreshKey])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Properties</h1>
          <p className="text-muted-foreground">All properties linked to your account</p>
        </div>
        <AddPropertyDialog onPropertyCreated={() => setRefreshKey((k) => k + 1)} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {properties.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Home className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">No properties yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first property to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => {
            const latestInspection = prop.inspections?.[0]
            const projectCount = prop._count?.projects ?? (prop.projects?.length ?? 0)

            return (
              <Card key={prop.id}>
                <CardHeader>
                  <CardTitle className="text-base">{prop.address_line1}</CardTitle>
                  <CardDescription>
                    {prop.city}, {prop.state} {prop.zip_code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {latestInspection && (
                      <Badge variant="secondary">
                        {latestInspection.status === 'APPROVED'
                          ? 'Inspected'
                          : latestInspection.status.replace('_', ' ')}
                      </Badge>
                    )}
                    {prop.has_pool && <Badge variant="outline">Pool</Badge>}
                    {projectCount > 0 && (
                      <Badge variant="outline">
                        {projectCount} project{projectCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {prop.issueCount > 0 && (
                      <Badge variant="outline">
                        {prop.issueCount} issue{prop.issueCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/homeowner/property/${prop.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
