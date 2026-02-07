import type {
  Property,
  Project,
  Issue,
  ScopeItem,
  Observation,
  Media,
  Section,
  SectionTemplate,
  IssueSeverity,
  Urgency,
  ProjectStatus,
} from '@prisma/client'

// Property with summary data for dashboard
export type PropertyWithSummary = Property & {
  issueCount: number
  lastInspectionDate: Date | null
  hasActiveProject: boolean
  projectStatus: ProjectStatus | null
}

// Issue with observation and media for homeowner view
export type IssueForHomeowner = Issue & {
  observation: Observation & {
    media: Media[]
    section: Section & {
      template: Pick<SectionTemplate, 'name' | 'icon'>
    }
  }
  scope_items: Array<{
    id: string
    project_id: string
    is_suppressed: boolean
  }>
}

// Grouped issues by severity
export type GroupedIssues = {
  safety: IssueForHomeowner[]
  major: IssueForHomeowner[]
  minor: IssueForHomeowner[]
  cosmetic: IssueForHomeowner[]
}

// Property issues response
export type PropertyIssuesResponse = {
  issues: IssueForHomeowner[]
  grouped: GroupedIssues
  activeProject: {
    id: string
    status: ProjectStatus
    title: string
  } | null
  inspectionId: string
  inspectionDate: Date | null
}

// Scope item with issue details for review
export type ScopeItemWithIssue = ScopeItem & {
  issue: {
    id: string
    normalized_title: string
    normalized_description: string
    homeowner_description: string
    severity_label: IssueSeverity
    severity_score: number
    trade_category: string
    master_format_code: string | null
    urgency: Urgency
    is_safety_hazard: boolean
    observation?: {
      media: Media[]
    }
  } | null
}

// Project with scope items for review
export type ProjectWithScope = Project & {
  property: Pick<Property, 'id' | 'address_line1' | 'address_line2' | 'city' | 'state' | 'zip_code'>
  owner: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  scope_items: ScopeItemWithIssue[]
  scope_snapshots: Array<{
    id: string
    version: number
    locked_at: Date
  }>
  proposals: Array<{
    id: string
    status: string
    total_amount: number
    contractor: {
      id: string
      first_name: string
      last_name: string
      contractor_profile: {
        company_name: string
      } | null
    }
  }>
}

// Severity display config for homeowner view
export const SEVERITY_DISPLAY: Record<
  'safety' | 'major' | 'minor' | 'cosmetic',
  {
    label: string
    description: string
    bgColor: string
    textColor: string
    borderColor: string
    icon: string
  }
> = {
  safety: {
    label: 'Safety Issues',
    description: 'These need immediate attention for your safety',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: 'alert-triangle',
  },
  major: {
    label: 'Major Issues',
    description: 'Should be addressed soon to prevent further damage',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: 'alert-circle',
  },
  minor: {
    label: 'Minor Issues',
    description: 'Worth fixing but not urgent',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: 'info',
  },
  cosmetic: {
    label: 'Cosmetic Issues',
    description: 'Optional improvements for appearance',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: 'paintbrush',
  },
}
