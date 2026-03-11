import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PropertyIssuesView } from '@/components/homeowner/PropertyIssuesView'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PropertyPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'HOMEOWNER' && user.role !== 'ADMIN') notFound()

  const { id } = await params

  // Verify property exists and belongs to user
  const property = await db.property.findUnique({
    where: { id },
    select: { id: true, owner_id: true },
  })

  if (!property) notFound()
  if (user.role === 'HOMEOWNER' && property.owner_id !== user.id) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <PropertyIssuesView propertyId={id} userId={user.id} />
    </div>
  )
}
