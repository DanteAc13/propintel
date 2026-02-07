import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InspectionCard } from '@/components/inspection/InspectionCard'
import { ClipboardCheck } from 'lucide-react'
import type { InspectionListItem } from '@/types/inspection'

export default async function InspectorDashboard() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'INSPECTOR') redirect('/login')

  const inspections = await db.inspection.findMany({
    where: {
      inspector_id: user.id,
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'IN_REVIEW'] },
    },
    include: {
      property: {
        select: {
          id: true,
          address_line1: true,
          address_line2: true,
          city: true,
          state: true,
          zip_code: true,
        },
      },
      sections: {
        select: {
          id: true,
          is_complete: true,
          is_not_applicable: true,
          observations: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { scheduled_date: 'asc' },
    ],
  })

  const [scheduled, inProgress, inReview] = await Promise.all([
    db.inspection.count({ where: { inspector_id: user.id, status: 'SCHEDULED' } }),
    db.inspection.count({ where: { inspector_id: user.id, status: 'IN_PROGRESS' } }),
    db.inspection.count({ where: { inspector_id: user.id, status: 'IN_REVIEW' } }),
  ])

  const scheduledInspections = inspections.filter(i => i.status === 'SCHEDULED') as InspectionListItem[]
  const inProgressInspections = inspections.filter(i => i.status === 'IN_PROGRESS') as InspectionListItem[]
  const inReviewInspections = inspections.filter(i => i.status === 'IN_REVIEW') as InspectionListItem[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Inspector Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your assigned inspections
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{scheduled}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Upcoming inspections</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl text-blue-600">{inProgress}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Awaiting Review</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl">{inReview}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Submitted for approval</p>
          </CardContent>
        </Card>
      </div>

      {/* In Progress - Show first if any */}
      {inProgressInspections.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">In Progress</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressInspections.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled */}
      {scheduledInspections.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Scheduled</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduledInspections.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </div>
        </section>
      )}

      {/* Awaiting Review */}
      {inReviewInspections.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Awaiting Review</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inReviewInspections.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {inspections.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">No inspections assigned</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When you&apos;re assigned inspections, they will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
