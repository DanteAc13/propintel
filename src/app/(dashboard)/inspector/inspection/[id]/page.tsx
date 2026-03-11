import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { InspectionWorkspace } from '@/components/inspection/InspectionWorkspace'
import type { InspectionWithProperty } from '@/types/inspection'

type Props = {
  params: Promise<{ id: string }>
}

async function getInspection(id: string): Promise<InspectionWithProperty | null> {
  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      property: true,
      inspector: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
      sections: {
        include: {
          template: true,
          observations: {
            include: {
              media: true,
            },
            orderBy: { order_index: 'asc' },
          },
        },
        orderBy: { order_index: 'asc' },
      },
    },
  })

  return inspection as InspectionWithProperty | null
}

export default async function InspectionPage({ params }: Props) {
  const { id } = await params

  // Auth first — before loading any data
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect('/login')
  }

  // Only inspectors and admins can access inspection workspace
  if (currentUser.role !== 'INSPECTOR' && currentUser.role !== 'ADMIN') {
    notFound()
  }

  const inspection = await getInspection(id)

  if (!inspection) {
    notFound()
  }

  // Inspectors can only access their own inspections
  if (currentUser.role === 'INSPECTOR' && inspection.inspector_id !== currentUser.id) {
    notFound()
  }

  return (
    <InspectionWorkspace
      initialInspection={inspection}
      inspectorId={currentUser.id}
    />
  )
}
