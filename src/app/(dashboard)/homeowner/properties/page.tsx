import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PropertyListWithCreate } from '@/components/homeowner/PropertyListWithCreate'

export default async function HomeownerPropertiesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'HOMEOWNER' && user.role !== 'ADMIN') redirect('/login')

  return <PropertyListWithCreate />
}
