import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { UserList } from '@/components/admin/UserList'

export default async function AdminUsersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') notFound()

  return <UserList />
}
