import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCOPE_LOCKED: 'bg-yellow-100 text-yellow-800',
  BIDDING: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-200 text-green-900',
}

export default async function HomeownerProjectsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'HOMEOWNER') redirect('/login')

  const projects = await db.project.findMany({
    where: { owner_id: user.id },
    include: {
      property: { select: { address_line1: true, city: true } },
      proposals: { where: { status: 'SUBMITTED' }, select: { id: true } },
      _count: { select: { scope_items: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Projects</h1>
        <p className="text-muted-foreground">Track your home improvement projects</p>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <Card key={proj.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate">{proj.title}</CardTitle>
                  <Badge className={statusColors[proj.status] || ''}>
                    {proj.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>
                  {proj.property.address_line1}, {proj.property.city}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{proj._count.scope_items} scope item{proj._count.scope_items !== 1 ? 's' : ''}</span>
                  {proj.proposals.length > 0 && (
                    <span>{proj.proposals.length} proposal{proj.proposals.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/homeowner/project/${proj.id}`}>View</Link>
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
