'use client'

import { useEffect, useState } from 'react'
import { Loader2, DollarSign, TrendingUp, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from './StatsCard'

type TradeInsight = {
  trade: string
  count: number
  average: number
  median: number
  min: number
  max: number
  total: number
}

type SeverityInsight = {
  severity: string
  count: number
  average: number
  min: number
  max: number
}

type PricingData = {
  totalLineItems: number
  totalProposals: number
  acceptedProposals: number
  byTrade: TradeInsight[]
  bySeverity: SeverityInsight[]
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
  UNKNOWN: 'bg-gray-100 text-gray-700',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PricingInsights() {
  const [data, setData] = useState<PricingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/pricing-insights')
        if (!res.ok) throw new Error('Failed to fetch')
        setData(await res.json())
      } catch (err) {
        console.error('Failed to fetch pricing insights:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Failed to load pricing insights
      </div>
    )
  }

  const hasData = data.totalLineItems > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Intelligence</h1>
        <p className="text-gray-500 mt-1">
          Cost benchmarks from proposal data
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Proposals"
          value={data.totalProposals}
          icon={BarChart3}
          color={data.totalProposals > 0 ? 'blue' : 'default'}
        />
        <StatsCard
          title="Accepted"
          value={data.acceptedProposals}
          icon={TrendingUp}
          color={data.acceptedProposals > 0 ? 'green' : 'default'}
        />
        <StatsCard
          title="Priced Items"
          value={data.totalLineItems}
          icon={DollarSign}
          color={data.totalLineItems > 0 ? 'amber' : 'default'}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No proposal data yet. Pricing insights will appear as contractors submit proposals.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* By trade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost by Trade Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 text-gray-500 font-medium">Trade</th>
                      <th className="pb-2 pr-4 text-gray-500 font-medium text-right">Items</th>
                      <th className="pb-2 pr-4 text-gray-500 font-medium text-right">Average</th>
                      <th className="pb-2 pr-4 text-gray-500 font-medium text-right">Median</th>
                      <th className="pb-2 pr-4 text-gray-500 font-medium text-right">Range</th>
                      <th className="pb-2 text-gray-500 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byTrade.map((row) => (
                      <tr key={row.trade} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{row.trade}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600">{row.count}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-900 font-medium">{formatCurrency(row.average)}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600">{formatCurrency(row.median)}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-500 text-xs">
                          {formatCurrency(row.min)} — {formatCurrency(row.max)}
                        </td>
                        <td className="py-2.5 text-right text-gray-900 font-semibold">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* By severity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.bySeverity.map((row) => (
                  <div
                    key={row.severity}
                    className="rounded-lg border p-4"
                  >
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_COLORS[row.severity] ?? SEVERITY_COLORS.UNKNOWN}`}>
                      {row.severity}
                    </span>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(row.average)}
                    </p>
                    <p className="text-xs text-gray-500">avg of {row.count} items</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatCurrency(row.min)} — {formatCurrency(row.max)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
