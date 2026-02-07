import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ContractorProjectPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Scope</h1>
        <p className="text-muted-foreground">Project ID: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scope Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Scope items matching your trade categories will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
