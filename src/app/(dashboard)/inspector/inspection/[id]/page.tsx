import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
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
  const inspection = await getInspection(id)

  if (!inspection) {
    notFound()
  }

  // For now, we use a placeholder inspector ID
  // In production, this comes from auth
  const inspectorId = inspection.inspector?.id || 'dev-inspector'

  return (
    <InspectionWorkspace
      initialInspection={inspection}
      inspectorId={inspectorId}
    />
  )
}
