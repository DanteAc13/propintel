// Special layout for inspection workspace - removes container padding
// for full-width inspection interface
export default function InspectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="h-full">{children}</div>
}
