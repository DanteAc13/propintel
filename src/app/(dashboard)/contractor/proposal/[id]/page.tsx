import { redirect, notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/

// Redirect singular /contractor/proposal/[id] → plural /contractor/proposals/[id]
export default async function ContractorProposalRedirect({ params }: Props) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  redirect(`/contractor/proposals/${id}`)
}
