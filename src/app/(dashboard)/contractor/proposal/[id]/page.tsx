import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProposalPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proposal</h1>
        <p className="text-muted-foreground">Proposal ID: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Proposal line items and pricing will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
