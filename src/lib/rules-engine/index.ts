/**
 * Rules Engine - The Moat
 *
 * Converts Observations into Issues using the DefectDictionary lookup table.
 *
 * Flow:
 * 1. Observation created/updated
 * 2. Match against DefectDictionary (section + component + condition)
 * 3. Exact match → fuzzy match → no match (flag for review)
 * 4. Generate Issue with normalized title, MasterFormat code, trade category, severity
 * 5. Inspector confirms or adjusts
 */

export { matchObservation } from './matcher'
export { generateIssue } from './issue-generator'
export type {
  MatchInput,
  MatchResult,
  IssueGeneratorInput,
  GeneratedIssue,
} from './types'
