import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

// GET /api/admin/pricing-insights — Aggregate proposal pricing by trade and severity
export async function GET() {
  try {
    const auth = await authenticateRequest(['ADMIN'])
    if (!auth.user) return auth.response

    // Get all proposal items from submitted/accepted proposals with their scope item context
    const items = await db.proposalItem.findMany({
      where: {
        proposal: {
          status: { in: ['SUBMITTED', 'ACCEPTED'] },
        },
      },
      select: {
        line_item_cost: true,
        scope_item: {
          select: {
            trade_category: true,
            issue: {
              select: {
                severity_label: true,
                severity_score: true,
                normalized_title: true,
              },
            },
          },
        },
        proposal: {
          select: { status: true },
        },
      },
    })

    // Aggregate by trade category
    const byTrade: Record<string, { count: number; total: number; min: number; max: number; costs: number[] }> = {}
    // Aggregate by severity
    const bySeverity: Record<string, { count: number; total: number; min: number; max: number }> = {}

    for (const item of items) {
      const cost = Number(item.line_item_cost)
      const trade = item.scope_item.trade_category
      const severity = item.scope_item.issue?.severity_label ?? 'UNKNOWN'

      // By trade
      if (!byTrade[trade]) {
        byTrade[trade] = { count: 0, total: 0, min: Infinity, max: 0, costs: [] }
      }
      byTrade[trade].count++
      byTrade[trade].total += cost
      byTrade[trade].min = Math.min(byTrade[trade].min, cost)
      byTrade[trade].max = Math.max(byTrade[trade].max, cost)
      byTrade[trade].costs.push(cost)

      // By severity
      if (!bySeverity[severity]) {
        bySeverity[severity] = { count: 0, total: 0, min: Infinity, max: 0 }
      }
      bySeverity[severity].count++
      bySeverity[severity].total += cost
      bySeverity[severity].min = Math.min(bySeverity[severity].min, cost)
      bySeverity[severity].max = Math.max(bySeverity[severity].max, cost)
    }

    // Compute averages and medians
    const tradeInsights = Object.entries(byTrade)
      .map(([trade, data]) => {
        const sorted = data.costs.sort((a, b) => a - b)
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]

        return {
          trade,
          count: data.count,
          average: Math.round(data.total / data.count),
          median: Math.round(median),
          min: data.min === Infinity ? 0 : Math.round(data.min),
          max: Math.round(data.max),
          total: Math.round(data.total),
        }
      })
      .sort((a, b) => b.total - a.total)

    const severityInsights = Object.entries(bySeverity)
      .map(([severity, data]) => ({
        severity,
        count: data.count,
        average: Math.round(data.total / data.count),
        min: data.min === Infinity ? 0 : Math.round(data.min),
        max: Math.round(data.max),
      }))

    // Overall stats (parallel)
    const [totalProposals, acceptedProposals] = await Promise.all([
      db.proposal.count({
        where: { status: { in: ['SUBMITTED', 'ACCEPTED'] } },
      }),
      db.proposal.count({
        where: { status: 'ACCEPTED' },
      }),
    ])

    return NextResponse.json({
      totalLineItems: items.length,
      totalProposals,
      acceptedProposals,
      byTrade: tradeInsights,
      bySeverity: severityInsights,
    })
  } catch (error) {
    console.error('Error fetching pricing insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing insights' },
      { status: 500 }
    )
  }
}
