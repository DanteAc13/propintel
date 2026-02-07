import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, ClipboardCheck, HardHat, FolderOpen } from 'lucide-react'

export default async function AdminDashboard() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/login')

  const [
    totalUsers,
    pendingInspections,
    pendingContractors,
    activeProjects,
    recentInspections,
    recentContractors,
  ] = await Promise.all([
    db.user.count(),
    db.inspection.count({ where: { status: 'IN_REVIEW' } }),
    db.contractorProfile.count({ where: { status: 'PENDING' } }),
    db.project.count({ where: { status: { in: ['BIDDING', 'ACTIVE'] } } }),
    db.inspection.findMany({
      where: { status: 'IN_REVIEW' },
      include: {
        property: { select: { address_line1: true, city: true } },
        inspector: { select: { first_name: true, last_name: true } },
      },
      orderBy: { completed_at: 'desc' },
      take: 5,
    }),
    db.contractorProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { first_name: true, last_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Total Users
            </CardDescription>
            <CardTitle className="text-2xl">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendingInspections > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ClipboardCheck className="h-3.5 w-3.5" /> Pending Review
            </CardDescription>
            <CardTitle className="text-2xl">{pendingInspections}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendingContractors > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <HardHat className="h-3.5 w-3.5" /> Contractor Verifications
            </CardDescription>
            <CardTitle className="text-2xl">{pendingContractors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5" /> Active Projects
            </CardDescription>
            <CardTitle className="text-2xl">{activeProjects}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Queues */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inspection Review Queue</CardTitle>
                <CardDescription>Inspections awaiting approval</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/inspections">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInspections.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No inspections pending review.
              </p>
            ) : (
              <div className="space-y-3">
                {recentInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {insp.property.address_line1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Inspector: {insp.inspector?.first_name} {insp.inspector?.last_name}
                      </p>
                    </div>
                    <Badge variant="outline">In Review</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contractor Verification Queue</CardTitle>
                <CardDescription>Contractors awaiting verification</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/contractors">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentContractors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No contractors pending verification.
              </p>
            ) : (
              <div className="space-y-3">
                {recentContractors.map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{cp.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cp.user.first_name} {cp.user.last_name} &middot; {cp.user.email}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
