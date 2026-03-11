'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer, AlertTriangle, AlertCircle, Info, Paintbrush, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PropertyIssuesResponse, IssueForHomeowner } from '@/types/homeowner'
import type { Property } from '@prisma/client'

type AssessmentReportProps = {
  propertyId: string
}

const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Safety Hazard', color: '#dc2626', bg: '#fef2f2', Icon: AlertTriangle },
  HIGH: { label: 'Major Defect', color: '#ea580c', bg: '#fff7ed', Icon: AlertCircle },
  MEDIUM: { label: 'Minor Defect', color: '#ca8a04', bg: '#fefce8', Icon: Info },
  LOW: { label: 'Cosmetic', color: '#2563eb', bg: '#eff6ff', Icon: Paintbrush },
}

function IssueRow({ issue, index }: { issue: IssueForHomeowner; index: number }) {
  const config = SEVERITY_CONFIG[issue.severity_label]

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-3 pr-3 text-sm text-gray-400 align-top">{index + 1}</td>
      <td className="py-3 pr-3 align-top">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.label}
        </span>
      </td>
      <td className="py-3 pr-3 align-top">
        <p className="text-sm font-medium text-gray-900">{issue.homeowner_description}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {issue.observation.section.template.name}
          {issue.observation.location_detail && ` — ${issue.observation.location_detail}`}
        </p>
      </td>
      <td className="py-3 pr-3 text-xs text-gray-600 align-top whitespace-nowrap">
        {issue.urgency === 'IMMEDIATE' && 'Immediate'}
        {issue.urgency === 'SHORT_TERM' && 'Short-term'}
        {issue.urgency === 'LONG_TERM' && 'Long-term'}
        {issue.urgency === 'MONITOR' && 'Monitor'}
      </td>
      <td className="py-3 text-xs text-gray-600 align-top">{issue.trade_category}</td>
    </tr>
  )
}

export function AssessmentReport({ propertyId }: AssessmentReportProps) {
  const [property, setProperty] = useState<Property | null>(null)
  const [issuesData, setIssuesData] = useState<PropertyIssuesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [propRes, issuesRes] = await Promise.all([
          fetch(`/api/properties/${propertyId}`),
          fetch(`/api/properties/${propertyId}/issues`),
        ])
        if (!propRes.ok || !issuesRes.ok) throw new Error('Failed to fetch data')
        setProperty(await propRes.json())
        setIssuesData(await issuesRes.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [propertyId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !property || !issuesData) {
    return (
      <div className="p-8 text-red-600">{error || 'Failed to load report data'}</div>
    )
  }

  const { grouped, inspectionDate, issues } = issuesData
  const totalIssues = issues.length
  const safetyCount = grouped.safety.length
  const majorCount = grouped.major.length

  // Sort all issues: safety first, then major, minor, cosmetic
  const sortedIssues = [
    ...grouped.safety,
    ...grouped.major,
    ...grouped.minor,
    ...grouped.cosmetic,
  ]

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .print-break { page-break-before: always; }
          @page { margin: 0.75in; size: letter; }
        }
      `}</style>

      {/* Print button (hidden in print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save PDF
        </Button>
        <Button variant="outline" onClick={() => window.close()}>
          Close
        </Button>
      </div>

      {/* Report content */}
      <div className="print-page max-w-3xl mx-auto p-8 bg-white min-h-screen">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Property Assessment
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                {property.address_line1}
              </p>
              <p className="text-gray-500">
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              {inspectionDate && (
                <p>
                  <span className="font-medium text-gray-700">Inspection Date:</span>{' '}
                  {new Date(inspectionDate).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              )}
              <p>
                <span className="font-medium text-gray-700">Report Generated:</span>{' '}
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { count: safetyCount, label: 'Safety', color: '#dc2626', bgColor: '#fef2f2' },
            { count: majorCount, label: 'Major', color: '#ea580c', bgColor: '#fff7ed' },
            { count: grouped.minor.length, label: 'Minor', color: '#ca8a04', bgColor: '#fefce8' },
            { count: grouped.cosmetic.length, label: 'Cosmetic', color: '#2563eb', bgColor: '#eff6ff' },
          ].map(({ count, label, color, bgColor }) => (
            <div
              key={label}
              className="rounded-lg p-4 text-center border"
              style={{ backgroundColor: count > 0 ? bgColor : '#fafafa' }}
            >
              <p
                className="text-3xl font-bold"
                style={{ color: count > 0 ? color : '#d4d4d8' }}
              >
                {count}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* No issues */}
        {totalIssues === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900">No Issues Found</h2>
            <p className="text-gray-500 mt-1">The property passed inspection with no deficiencies noted.</p>
          </div>
        )}

        {/* Issues table */}
        {totalIssues > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Findings ({totalIssues} item{totalIssues !== 1 ? 's' : ''})
            </h2>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left">
                  <th className="pb-2 pr-3 text-xs text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th className="pb-2 pr-3 text-xs text-gray-500 uppercase tracking-wide w-28">Severity</th>
                  <th className="pb-2 pr-3 text-xs text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="pb-2 pr-3 text-xs text-gray-500 uppercase tracking-wide w-20">Urgency</th>
                  <th className="pb-2 text-xs text-gray-500 uppercase tracking-wide w-24">Trade</th>
                </tr>
              </thead>
              <tbody>
                {sortedIssues.map((issue, i) => (
                  <IssueRow key={issue.id} issue={issue} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Safety callout */}
        {safetyCount > 0 && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">
                  {safetyCount} Safety Hazard{safetyCount > 1 ? 's' : ''} Identified
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Safety hazards should be addressed as soon as possible. We recommend
                  contacting a qualified contractor to review and remediate these items promptly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>
            This assessment report is provided for informational purposes.
            All findings should be verified by qualified licensed contractors before remediation.
          </p>
          <p className="mt-1">
            Generated by PropIntel &mdash; Property Intelligence &amp; Execution Platform
          </p>
        </div>
      </div>
    </>
  )
}
