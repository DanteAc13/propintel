import { ContractorDashboard } from '@/components/contractor/ContractorDashboard'

// TODO: Get actual user ID from session
const DEMO_USER_ID = 'demo-contractor-id'

export default function ContractorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <ContractorDashboard userId={DEMO_USER_ID} />
      </div>
    </div>
  )
}
