import { ProjectBidView } from '@/components/contractor/ProjectBidView'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ContractorProjectPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ProjectBidView projectId={id} userId={user.id} />
      </div>
    </div>
  )
}
