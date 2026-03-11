import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { ScopeReview } from '@/components/homeowner/ScopeReview'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'HOMEOWNER' && user.role !== 'ADMIN') notFound()

  const { id } = await params

  // Verify project exists and belongs to user
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, owner_id: true },
  })

  if (!project) notFound()
  if (user.role === 'HOMEOWNER' && project.owner_id !== user.id) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <ScopeReview projectId={id} />
    </div>
  )
}
