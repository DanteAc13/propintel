'use client'

import { useEffect, useState } from 'react'
import { Home, Loader2 } from 'lucide-react'
import { PropertyCard } from './PropertyCard'
import type { PropertyWithSummary } from '@/types/homeowner'

type HomeownerDashboardProps = {
  userId: string
}

export function HomeownerDashboard({ userId }: HomeownerDashboardProps) {
  const [properties, setProperties] = useState<PropertyWithSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProperties() {
      try {
        const response = await fetch(`/api/properties?owner_id=${userId}`)
        if (!response.ok) throw new Error('Failed to fetch properties')
        const data = await response.json()
        setProperties(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [userId])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
        <p className="text-gray-500 mt-1">
          View inspection results and manage projects
        </p>
      </div>

      {/* Property list */}
      {properties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No properties yet</h3>
          <p className="text-gray-500 mt-1">
            Properties will appear here after an inspection is completed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
