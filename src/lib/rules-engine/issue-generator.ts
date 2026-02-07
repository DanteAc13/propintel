import type { IssueGeneratorInput, GeneratedIssue } from './types'
import type { IssueSeverity } from '@prisma/client'

/**
 * Convert numeric severity score to label
 */
function severityScoreToLabel(score: number): IssueSeverity {
  switch (score) {
    case 4:
      return 'CRITICAL'
    case 3:
      return 'HIGH'
    case 2:
      return 'MEDIUM'
    default:
      return 'LOW'
  }
}

/**
 * Generate an Issue from a matched DefectDictionary entry.
 * Returns null if no match was found.
 */
export function generateIssue(input: IssueGeneratorInput): GeneratedIssue | null {
  const { observationId, inspectionId, propertyId, matchResult, urgency } = input

  if (!matchResult.matched || !matchResult.normalizedTitle || !matchResult.severityScore) {
    return null
  }

  return {
    observation_id: observationId,
    inspection_id: inspectionId,
    property_id: propertyId,
    normalized_title: matchResult.normalizedTitle,
    normalized_description: matchResult.normalizedDescription || '',
    homeowner_description: matchResult.homeownerDescription || '',
    master_format_code: matchResult.masterFormatCode,
    trade_category: matchResult.tradeCategory || 'General',
    severity_score: matchResult.severityScore,
    severity_label: severityScoreToLabel(matchResult.severityScore),
    risk_category: matchResult.riskCategory,
    urgency: urgency,
    is_safety_hazard: matchResult.isSafetyHazard,
    insurance_relevant: matchResult.insuranceRelevant,
  }
}
