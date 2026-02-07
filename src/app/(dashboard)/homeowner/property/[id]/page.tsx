import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PropertyPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Property Details</h1>
        <p className="text-muted-foreground">Property ID: {id}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Property details will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
