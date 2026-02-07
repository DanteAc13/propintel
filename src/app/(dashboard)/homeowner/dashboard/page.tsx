import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home, AlertTriangle, FolderOpen, FileText } from 'lucide-react'
import Link from 'next/link'

export default async function HomeownerDashboard() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'HOMEOWNER') redirect('/login')

  const [properties, projects, issueCount] = await Promise.all([
    db.property.findMany({
      where: { owner_id: user.id },
      include: {
        inspections: {
          where: { status: 'APPROVED' },
          select: { id: true, status: true },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    db.project.findMany({
      where: { owner_id: user.id },
      include: {
        property: { select: { address_line1: true, city: true } },
        proposals: { where: { status: 'SUBMITTED' }, select: { id: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    db.issue.count({
      where: {
        inspection: { property: { owner_id: user.id } },
      },
    }),
  ])

  const safetyIssues = await db.issue.count({
    where: {
      inspection: { property: { owner_id: user.id } },
      is_safety_hazard: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome, {user.first_name}
        </h1>
        <p className="text-muted-foreground">Your property intelligence dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Properties</CardDescription>
            <CardTitle className="text-2xl">{properties.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Issues Found</CardDescription>
            <CardTitle className="text-2xl">{issueCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={safetyIssues > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Safety Hazards</CardDescription>
            <CardTitle className="text-2xl text-destructive">{safetyIssues}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Projects</CardDescription>
            <CardTitle className="text-2xl">{projects.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Properties */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Properties</h2>
        {properties.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Home className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No properties yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Properties will appear here once you schedule an inspection.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((prop) => (
              <Card key={prop.id}>
                <CardHeader>
                  <CardTitle className="text-base">{prop.address_line1}</CardTitle>
                  <CardDescription>
                    {prop.city}, {prop.state} {prop.zip_code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {prop.inspections.length > 0 && (
                      <Badge variant="secondary">Inspected</Badge>
                    )}
                    {prop.has_pool && <Badge variant="outline">Pool</Badge>}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/homeowner/property/${prop.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Projects</h2>
        {projects.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No projects yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                After your inspection is complete, select issues to fix and create a project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((proj) => {
              const statusColors: Record<string, string> = {
                DRAFT: 'bg-gray-100 text-gray-800',
                SCOPE_LOCKED: 'bg-yellow-100 text-yellow-800',
                BIDDING: 'bg-blue-100 text-blue-800',
                ACTIVE: 'bg-green-100 text-green-800',
                COMPLETED: 'bg-green-200 text-green-900',
              }
              return (
                <Card key={proj.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{proj.title}</CardTitle>
                      <Badge className={statusColors[proj.status] || ''}>
                        {proj.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>
                      {proj.property.address_line1}, {proj.property.city}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    {proj.proposals.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {proj.proposals.length} proposal{proj.proposals.length !== 1 ? 's' : ''} received
                      </span>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/homeowner/project/${proj.id}`}>View</Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
