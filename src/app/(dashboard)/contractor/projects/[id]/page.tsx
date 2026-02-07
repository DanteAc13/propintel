import { ProjectBidView } from '@/components/contractor/ProjectBidView'

// TODO: Get actual user ID from session
const DEMO_USER_ID = 'demo-contractor-id'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ContractorProjectPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ProjectBidView projectId={id} userId={DEMO_USER_ID} />
      </div>
    </div>
  )
}
