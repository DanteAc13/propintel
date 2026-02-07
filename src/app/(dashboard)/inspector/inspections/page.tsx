import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardCheck } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export default async function InspectorInspectionsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'INSPECTOR') redirect('/login')

  const inspections = await db.inspection.findMany({
    where: { inspector_id: user.id },
    include: {
      property: {
        select: { address_line1: true, city: true, state: true },
      },
      _count: { select: { sections: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Inspections</h1>
        <p className="text-muted-foreground">All inspections assigned to you</p>
      </div>

      {inspections.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">No inspections assigned</h3>
            <p className="text-sm text-muted-foreground mt-1">
              When you&apos;re assigned inspections, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inspections.map((insp) => (
            <Card key={insp.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate">
                    {insp.property.address_line1}
                  </CardTitle>
                  <Badge className={statusColors[insp.status] || ''}>
                    {insp.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>
                  {insp.property.city}, {insp.property.state}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{insp._count.sections} section{insp._count.sections !== 1 ? 's' : ''}</span>
                  {insp.scheduled_date && (
                    <span>{new Date(insp.scheduled_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/inspector/inspection/${insp.id}`}>
                      {insp.status === 'IN_PROGRESS' ? 'Continue' : 'View'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
