import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardShellWrapper } from './DashboardShellWrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShellWrapper
      role={user.role}
      userName={`${user.first_name} ${user.last_name}`}
      userEmail={user.email}
    >
      {children}
    </DashboardShellWrapper>
  )
}
