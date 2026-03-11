import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { ContractorQueue } from '@/components/admin/ContractorQueue'

export default async function AdminContractorsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') notFound()

  return <ContractorQueue />
}
