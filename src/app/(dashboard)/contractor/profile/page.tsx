import { ContractorProfile } from '@/components/contractor/ContractorProfile'

// TODO: Get actual user ID from session
const DEMO_USER_ID = 'demo-contractor-id'

export default function ContractorProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ContractorProfile userId={DEMO_USER_ID} />
      </div>
    </div>
  )
}
