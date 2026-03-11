import { ContractorProfile } from '@/components/contractor/ContractorProfile'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ContractorProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ContractorProfile userId={user.id} />
      </div>
    </div>
  )
}
