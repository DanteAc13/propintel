import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { PricingInsights } from '@/components/admin/PricingInsights'

export default async function PricingPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/login')

  return <PricingInsights />
}
