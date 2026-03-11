import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DefectDictionaryManager } from '@/components/admin/DefectDictionaryManager'

export default async function DefectDictionaryPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/login')

  return <DefectDictionaryManager />
}
