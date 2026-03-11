import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AssessmentReport } from '@/components/homeowner/AssessmentReport'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PropertyReportPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'HOMEOWNER' && user.role !== 'ADMIN') redirect('/login')

  const { id } = await params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) notFound()

  return <AssessmentReport propertyId={id} />
}
