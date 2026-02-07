import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminContractorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contractors</h1>
        <p className="text-muted-foreground">
          Manage contractor verification and profiles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contractors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contractor list will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
