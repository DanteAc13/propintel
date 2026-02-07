import { db } from '@/lib/db'
import type { MatchInput, MatchResult } from './types'

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Match an observation against the DefectDictionary.
 * Strategy:
 * 1. Exact match first (component + condition + optional severity)
 * 2. Fuzzy match second (Levenshtein distance < 3 or substring match)
 * 3. Fallback: no match (flag for manual review)
 */
export async function matchObservation(input: MatchInput): Promise<MatchResult> {
  const { sectionTemplateId, component, status, severity } = input
  const componentLower = component.toLowerCase()

  // 1. Try exact match with severity
  let defect = await db.defectDictionary.findFirst({
    where: {
      section_template_id: sectionTemplateId,
      component_match: component,
      condition_match: status,
      severity_match: severity,
      is_active: true,
    },
  })

  if (defect) {
    return {
      matched: true,
      defectId: defect.id,
      normalizedTitle: defect.normalized_title,
      normalizedDescription: defect.normalized_description,
      homeownerDescription: defect.homeowner_description,
      masterFormatCode: defect.master_format_code,
      tradeCategory: defect.trade_category,
      severityScore: defect.default_severity_score,
      riskCategory: defect.risk_category,
      isSafetyHazard: defect.is_safety_hazard,
      insuranceRelevant: defect.insurance_relevant,
      matchType: 'exact',
    }
  }

  // 2. Try exact match without severity
  defect = await db.defectDictionary.findFirst({
    where: {
      section_template_id: sectionTemplateId,
      component_match: component,
      condition_match: status,
      severity_match: null,
      is_active: true,
    },
  })

  if (defect) {
    return {
      matched: true,
      defectId: defect.id,
      normalizedTitle: defect.normalized_title,
      normalizedDescription: defect.normalized_description,
      homeownerDescription: defect.homeowner_description,
      masterFormatCode: defect.master_format_code,
      tradeCategory: defect.trade_category,
      severityScore: defect.default_severity_score,
      riskCategory: defect.risk_category,
      isSafetyHazard: defect.is_safety_hazard,
      insuranceRelevant: defect.insurance_relevant,
      matchType: 'exact',
    }
  }

  // 3. Fuzzy match - find all defects for this section and condition
  const candidates = await db.defectDictionary.findMany({
    where: {
      section_template_id: sectionTemplateId,
      condition_match: status,
      is_active: true,
    },
  })

  for (const candidate of candidates) {
    const candidateLower = candidate.component_match.toLowerCase()

    // Check substring match
    if (componentLower.includes(candidateLower) || candidateLower.includes(componentLower)) {
      return {
        matched: true,
        defectId: candidate.id,
        normalizedTitle: candidate.normalized_title,
        normalizedDescription: candidate.normalized_description,
        homeownerDescription: candidate.homeowner_description,
        masterFormatCode: candidate.master_format_code,
        tradeCategory: candidate.trade_category,
        severityScore: candidate.default_severity_score,
        riskCategory: candidate.risk_category,
        isSafetyHazard: candidate.is_safety_hazard,
        insuranceRelevant: candidate.insurance_relevant,
        matchType: 'fuzzy',
      }
    }

    // Check Levenshtein distance
    if (levenshteinDistance(componentLower, candidateLower) < 3) {
      return {
        matched: true,
        defectId: candidate.id,
        normalizedTitle: candidate.normalized_title,
        normalizedDescription: candidate.normalized_description,
        homeownerDescription: candidate.homeowner_description,
        masterFormatCode: candidate.master_format_code,
        tradeCategory: candidate.trade_category,
        severityScore: candidate.default_severity_score,
        riskCategory: candidate.risk_category,
        isSafetyHazard: candidate.is_safety_hazard,
        insuranceRelevant: candidate.insurance_relevant,
        matchType: 'fuzzy',
      }
    }
  }

  // 4. No match found
  return {
    matched: false,
    defectId: null,
    normalizedTitle: null,
    normalizedDescription: null,
    homeownerDescription: null,
    masterFormatCode: null,
    tradeCategory: null,
    severityScore: null,
    riskCategory: null,
    isSafetyHazard: false,
    insuranceRelevant: false,
    matchType: 'none',
  }
}
