import type {
  ContractorProfile,
  User,
  Project,
  Property,
  ScopeItem,
  ScopeSnapshot,
  Proposal,
  ProposalItem,
  Issue,
  Observation,
  Media,
  ProposalStatus,
  ProjectStatus,
  ContractorAccountStatus,
} from '@prisma/client'

// Trade categories available for contractors (CSI MasterFormat-based)
export const TRADE_CATEGORIES = [
  { value: 'Roofing', label: 'Roofing', masterFormat: '07-30-00' },
  { value: 'Electrical', label: 'Electrical', masterFormat: '26-00-00' },
  { value: 'Plumbing', label: 'Plumbing', masterFormat: '22-00-00' },
  { value: 'HVAC', label: 'HVAC', masterFormat: '23-00-00' },
  { value: 'General', label: 'General Contractor', masterFormat: '01-00-00' },
  { value: 'Structural', label: 'Structural / Foundation', masterFormat: '03-00-00' },
  { value: 'Siding', label: 'Siding / Exterior', masterFormat: '07-46-00' },
  { value: 'Windows', label: 'Windows & Doors', masterFormat: '08-00-00' },
  { value: 'Flooring', label: 'Flooring', masterFormat: '09-60-00' },
  { value: 'Painting', label: 'Painting', masterFormat: '09-90-00' },
  { value: 'Pool', label: 'Pool & Spa', masterFormat: '13-11-00' },
  { value: 'Landscaping', label: 'Landscaping & Drainage', masterFormat: '32-00-00' },
  { value: 'Insulation', label: 'Insulation', masterFormat: '07-21-00' },
  { value: 'Drywall', label: 'Drywall & Plastering', masterFormat: '09-29-00' },
] as const

export type TradeCategory = typeof TRADE_CATEGORIES[number]['value']

// Contractor profile with user info
export type ContractorProfileFull = ContractorProfile & {
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'>
}

// Contractor stats for dashboard
export type ContractorStats = {
  availableProjects: number
  activeBids: number
  wonProjects: number
  totalProposals: number
}

// Available project for contractor (filtered by trade match)
export type AvailableProject = {
  id: string
  title: string
  status: ProjectStatus
  property: {
    id: string
    address_line1: string
    city: string
    state: string
    zip_code: string
  }
  scope_locked_at: Date | null
  matchingItemsCount: number
  totalItemsCount: number
  latestSnapshot: {
    id: string
    version: number
  } | null
}

// Scope item with issue details for contractor bid view
export type ScopeItemForBid = ScopeItem & {
  issue: {
    id: string
    normalized_title: string
    normalized_description: string
    master_format_code: string | null
    trade_category: string
    severity_label: string
    severity_score: number
    urgency: string
    is_safety_hazard: boolean
    observation: {
      id: string
      component: string
      description_raw: string | null
      location_detail: string | null
      inspector_notes: string | null
      media: Media[]
    }
  } | null
}

// Project detail for contractor with filtered scope items
export type ProjectForContractor = {
  id: string
  title: string
  status: ProjectStatus
  property: {
    id: string
    address_line1: string
    address_line2: string | null
    city: string
    state: string
    zip_code: string
    year_built: number | null
    square_footage: number | null
  }
  scope_locked_at: Date | null
  latestSnapshot: {
    id: string
    version: number
    locked_at: Date
  } | null
  matchingScopeItems: ScopeItemForBid[]
  existingProposal: {
    id: string
    status: ProposalStatus
    total_amount: number
  } | null
}

// Proposal with items for contractor
export type ProposalWithItems = Proposal & {
  project: {
    id: string
    title: string
    property: {
      address_line1: string
      city: string
      state: string
    }
  }
  items: (ProposalItem & {
    scope_item: {
      id: string
      title: string
      trade_category: string
    }
  })[]
}

// Proposal list item for dashboard
export type ProposalListItem = {
  id: string
  status: ProposalStatus
  total_amount: number
  submitted_at: Date | null
  expires_at: Date
  project: {
    id: string
    title: string
    property: {
      address_line1: string
      city: string
      state: string
    }
  }
  itemCount: number
}

// Create proposal request
export type CreateProposalRequest = {
  project_id: string
  scope_snapshot_id: string
  items: {
    scope_item_id: string
    line_item_cost: number
    notes?: string
  }[]
  notes?: string
  estimated_start_date?: string
  estimated_duration_days?: number
}

// Status display config
export const PROPOSAL_STATUS_DISPLAY: Record<
  ProposalStatus,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-50' },
  SUBMITTED: { label: 'Submitted', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-50' },
  REJECTED: { label: 'Not Selected', color: 'text-red-700', bgColor: 'bg-red-50' },
  EXPIRED: { label: 'Expired', color: 'text-gray-700', bgColor: 'bg-gray-50' },
  OUTDATED: { label: 'Outdated', color: 'text-amber-700', bgColor: 'bg-amber-50' },
}

export const CONTRACTOR_STATUS_DISPLAY: Record<
  ContractorAccountStatus,
  { label: string; description: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: 'Pending Verification',
    description: 'Your profile is under review. You\'ll be notified once approved.',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  ACTIVE: {
    label: 'Active',
    description: 'You can view projects and submit proposals.',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  SUSPENDED: {
    label: 'Suspended',
    description: 'Your account has been suspended. Contact support for assistance.',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  REJECTED: {
    label: 'Application Rejected',
    description: 'Your application was not approved. Contact support for more information.',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  },
}
