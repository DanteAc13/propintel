import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FolderOpen, FileText, AlertCircle } from 'lucide-react'

export default async function ContractorDashboard() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'CONTRACTOR') redirect('/login')

  const profile = await db.contractorProfile.findUnique({
    where: { user_id: user.id },
  })

  // If no profile, prompt to create one
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, {user.first_name}
          </h1>
          <p className="text-muted-foreground">Complete your contractor profile to get started</p>
        </div>
        <Card className="py-12">
          <CardContent className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">Profile Required</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Set up your company profile, trade categories, and credentials to see available projects.
            </p>
            <Button asChild>
              <Link href="/contractor/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Profile exists, check status
  if (profile.status === 'PENDING') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, {user.first_name}
          </h1>
          <p className="text-muted-foreground">{profile.company_name}</p>
        </div>
        <Card className="border-yellow-300 py-12">
          <CardContent className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
            <h3 className="font-medium">Verification Pending</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your account is being reviewed by an admin. You&apos;ll be able to see available
              projects once verified.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active contractor - show real data
  const [proposals, availableProjects] = await Promise.all([
    db.proposal.findMany({
      where: { contractor_id: user.id },
      include: {
        project: {
          include: { property: { select: { address_line1: true, city: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    db.project.count({
      where: {
        status: 'BIDDING',
        scope_items: {
          some: { trade_category: { in: profile.trade_categories }, is_suppressed: false },
        },
      },
    }),
  ])

  const submittedCount = proposals.filter((p) => p.status === 'SUBMITTED').length
  const acceptedCount = proposals.filter((p) => p.status === 'ACCEPTED').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome, {user.first_name}
        </h1>
        <p className="text-muted-foreground">{profile.company_name}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Projects</CardDescription>
            <CardTitle className="text-2xl">{availableProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Proposals</CardDescription>
            <CardTitle className="text-2xl">{submittedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Won Projects</CardDescription>
            <CardTitle className="text-2xl">{acceptedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Proposals */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Proposals</h2>
        {proposals.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No proposals yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browse available projects and submit proposals to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {proposals.map((proposal) => {
              const statusColors: Record<string, string> = {
                DRAFT: 'bg-gray-100 text-gray-800',
                SUBMITTED: 'bg-blue-100 text-blue-800',
                ACCEPTED: 'bg-green-100 text-green-800',
                REJECTED: 'bg-red-100 text-red-800',
                EXPIRED: 'bg-gray-100 text-gray-600',
              }
              return (
                <Card key={proposal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {proposal.project.property.address_line1}
                      </CardTitle>
                      <Badge className={statusColors[proposal.status] || ''}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {proposal.project.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      ${Number(proposal.total_amount).toLocaleString()}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/contractor/proposal/${proposal.id}`}>View</Link>
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
