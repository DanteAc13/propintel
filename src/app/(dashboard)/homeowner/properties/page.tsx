import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import Link from 'next/link'

export default async function HomeownerPropertiesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'HOMEOWNER') redirect('/login')

  const properties = await db.property.findMany({
    where: { owner_id: user.id },
    include: {
      inspections: {
        select: { id: true, status: true, completed_at: true },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      _count: { select: { projects: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Properties</h1>
        <p className="text-muted-foreground">All properties linked to your account</p>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => (
            <Card key={prop.id}>
              <CardHeader>
                <CardTitle className="text-base">{prop.address_line1}</CardTitle>
                <CardDescription>
                  {prop.city}, {prop.state} {prop.zip_code}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {prop.inspections.length > 0 && (
                    <Badge variant="secondary">
                      {prop.inspections[0].status === 'APPROVED' ? 'Inspected' : prop.inspections[0].status.replace('_', ' ')}
                    </Badge>
                  )}
                  {prop.has_pool && <Badge variant="outline">Pool</Badge>}
                  {prop._count.projects > 0 && (
                    <Badge variant="outline">{prop._count.projects} project{prop._count.projects !== 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/homeowner/property/${prop.id}`}>View Details</Link>
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
