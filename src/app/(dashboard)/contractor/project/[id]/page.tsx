import { redirect, notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/

// Redirect singular /contractor/project/[id] → plural /contractor/projects/[id]
export default async function ContractorProjectRedirect({ params }: Props) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  redirect(`/contractor/projects/${id}`)
}
