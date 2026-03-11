import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { InspectionQueue } from '@/components/admin/InspectionQueue'

export default async function AdminInspectionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') notFound()

  return <InspectionQueue />
}
