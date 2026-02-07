import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminInspectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
        <p className="text-muted-foreground">
          Manage all inspections in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Inspection list will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
