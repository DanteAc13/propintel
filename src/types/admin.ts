import type {
  Inspection,
  Property,
  User,
  ContractorProfile,
  InspectionStatus,
  ContractorAccountStatus,
  Role,
} from '@prisma/client'

// Admin stats response
export type AdminStats = {
  inspections: {
    pendingAssignment: number
    inProgress: number
    needsReview: number
  }
  contractors: {
    pendingVerification: number
    active: number
  }
  users: {
    total: number
    byRole: Record<string, number>
  }
  projects: {
    active: number
  }
  activity: {
    issuesLast30Days: number
  }
}

// Inspection with property and inspector info for admin queues
export type InspectionForAdmin = Inspection & {
  property: Property & {
    owner: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null
  }
  inspector: Pick<User, 'id' | 'first_name' | 'last_name' | 'email'> | null
  _count: {
    sections: number
    issues: number
  }
}

// Available inspector for assignment
export type AvailableInspector = {
  id: string
  first_name: string
  last_name: string
  email: string
  active_inspections: number
}

// Inspection queue response
export type InspectionQueueResponse = {
  inspections: InspectionForAdmin[]
  total: number
  limit: number
  offset: number
  availableInspectors?: AvailableInspector[]
}

// Contractor profile with user info for admin queue
export type ContractorForAdmin = ContractorProfile & {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'avatar_url' | 'created_at'>
  verified_by: Pick<User, 'id' | 'first_name' | 'last_name'> | null
}

// Contractor queue response
export type ContractorQueueResponse = {
  contractors: ContractorForAdmin[]
  total: number
  limit: number
  offset: number
}

// User with stats for admin list
export type UserForAdmin = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: Role
  avatar_url: string | null
  is_active: boolean
  email_verified: boolean
  created_at: Date
  updated_at: Date
  stats: {
    properties: number
    inspections: number
    projects: number
    proposals: number
  }
  contractor_profile: {
    id: string
    company_name: string
    status: ContractorAccountStatus
    trade_categories: string[]
  } | null
}

// User list response
export type UserListResponse = {
  users: UserForAdmin[]
  total: number
  limit: number
  offset: number
}

// Status display config
export const INSPECTION_STATUS_DISPLAY: Record<
  InspectionStatus,
  { label: string; color: string; bgColor: string }
> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  IN_REVIEW: { label: 'Needs Review', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  APPROVED: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-50' },
  REJECTED: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50' },
}

export const CONTRACTOR_STATUS_DISPLAY: Record<
  ContractorAccountStatus,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  ACTIVE: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-50' },
  SUSPENDED: { label: 'Suspended', color: 'text-red-700', bgColor: 'bg-red-50' },
  REJECTED: { label: 'Rejected', color: 'text-gray-700', bgColor: 'bg-gray-50' },
}
