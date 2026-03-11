import { ContractorDashboard } from '@/components/contractor/ContractorDashboard'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ContractorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ContractorDashboard userId={user.id} />
      </div>
    </div>
  )
}
