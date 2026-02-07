// Re-export Prisma generated types for convenience
export type {
  User,
  Property,
  Inspection,
  Section,
  SectionTemplate,
  Observation,
  Media,
  DefectDictionary,
  Issue,
  Project,
  ScopeItem,
  ScopeSnapshot,
  ContractorProfile,
  Proposal,
  ProposalItem,
} from '@prisma/client'

// Re-export enums
export {
  Role,
  InspectionStatus,
  ObservationStatus,
  ObservationSeverity,
  Urgency,
  IssueSeverity,
  ProjectStatus,
  ProposalStatus,
  ContractorAccountStatus,
  PropertyType,
} from '@prisma/client'

// Custom types for common use cases

export type UserWithProfile = {
  id: string
  email: string
  role: 'HOMEOWNER' | 'INSPECTOR' | 'CONTRACTOR' | 'ADMIN'
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  email_verified: boolean
  is_active: boolean
}

export type ObservationWithMedia = {
  id: string
  section_id: string
  component: string
  description_raw: string | null
  status: 'DEFICIENT' | 'FUNCTIONAL' | 'NOT_INSPECTED' | 'NOT_PRESENT' | 'MAINTENANCE_NEEDED'
  severity: 'SAFETY_HAZARD' | 'MAJOR_DEFECT' | 'MINOR_DEFECT' | 'COSMETIC' | 'INFORMATIONAL'
  urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'MONITOR'
  location_detail: string | null
  inspector_notes: string | null
  media: {
    id: string
    storage_url: string
    thumbnail_url: string | null
    mime_type: string
  }[]
}

export type IssueWithObservation = {
  id: string
  normalized_title: string
  normalized_description: string
  homeowner_description: string
  severity_score: number
  severity_label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  trade_category: string
  is_safety_hazard: boolean
  observation: ObservationWithMedia
}
