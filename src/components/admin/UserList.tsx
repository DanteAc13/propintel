'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2,
  ArrowLeft,
  Search,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Building,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserListResponse, UserForAdmin } from '@/types/admin'

type RoleFilter = 'all' | 'HOMEOWNER' | 'INSPECTOR' | 'CONTRACTOR' | 'ADMIN'

const ROLE_COLORS: Record<string, string> = {
  HOMEOWNER: 'bg-blue-50 text-blue-700',
  INSPECTOR: 'bg-purple-50 text-purple-700',
  CONTRACTOR: 'bg-green-50 text-green-700',
  ADMIN: 'bg-gray-50 text-gray-700',
}

export function UserList() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = (searchParams.get('role') as RoleFilter) || 'all'

  const [role, setRole] = useState<RoleFilter>(initialRole)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<UserListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (role !== 'all') params.set('role', role)
        if (search) params.set('search', search)

        const response = await fetch(`/api/admin/users?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch users')
        const data = await response.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchUsers, 300)
    return () => clearTimeout(debounce)
  }, [role, search])

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">
          {data?.total ?? 0} user{data?.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as RoleFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="HOMEOWNER">Homeowners</SelectItem>
            <SelectItem value="INSPECTOR">Inspectors</SelectItem>
            <SelectItem value="CONTRACTOR">Contractors</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* User list */}
      {!isLoading && data?.users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && data.users.length > 0 && (
        <div className="space-y-3">
          {data.users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                        {user.role}
                      </Badge>
                      {user.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                      {user.email_verified && (
                        <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                      )}
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </div>
                    )}

                    {/* Contractor info */}
                    {user.contractor_profile && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Building className="h-3 w-3" />
                        {user.contractor_profile.company_name}
                        <Badge
                          variant="secondary"
                          className="ml-2 text-xs"
                        >
                          {user.contractor_profile.status}
                        </Badge>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-center text-sm">
                    {user.role === 'HOMEOWNER' && (
                      <>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.stats.properties}
                          </p>
                          <p className="text-gray-500">Properties</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.stats.projects}
                          </p>
                          <p className="text-gray-500">Projects</p>
                        </div>
                      </>
                    )}
                    {user.role === 'INSPECTOR' && (
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.stats.inspections}
                        </p>
                        <p className="text-gray-500">Inspections</p>
                      </div>
                    )}
                    {user.role === 'CONTRACTOR' && (
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.stats.proposals}
                        </p>
                        <p className="text-gray-500">Proposals</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
