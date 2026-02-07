import type { ObservationStatus, ObservationSeverity, Urgency } from '@prisma/client'

export type MatchInput = {
  sectionTemplateId: string
  component: string
  status: ObservationStatus
  severity: ObservationSeverity
}

export type MatchResult = {
  matched: boolean
  defectId: string | null
  normalizedTitle: string | null
  normalizedDescription: string | null
  homeownerDescription: string | null
  masterFormatCode: string | null
  tradeCategory: string | null
  severityScore: number | null
  riskCategory: string | null
  isSafetyHazard: boolean
  insuranceRelevant: boolean
  matchType: 'exact' | 'fuzzy' | 'none'
}

export type IssueGeneratorInput = {
  observationId: string
  inspectionId: string
  propertyId: string
  matchResult: MatchResult
  urgency: Urgency
}

export type GeneratedIssue = {
  observation_id: string
  inspection_id: string
  property_id: string
  normalized_title: string
  normalized_description: string
  homeowner_description: string
  master_format_code: string | null
  trade_category: string
  severity_score: number
  severity_label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  risk_category: string | null
  urgency: Urgency
  is_safety_hazard: boolean
  insurance_relevant: boolean
}
