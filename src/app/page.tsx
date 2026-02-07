import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, ClipboardCheck, Home, Wrench } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PropIntel</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-8 py-20 text-center md:py-32">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Property Intelligence &amp; Execution Platform
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            From home inspection to project completion. Structured data, scoped
            projects, verified contractors, transparent pricing.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/40 py-16">
          <div className="container">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<ClipboardCheck className="h-8 w-8" />}
                title="Inspectors"
                description="Capture structured observations in the field with offline-first tools and preset components."
              />
              <FeatureCard
                icon={<Home className="h-8 w-8" />}
                title="Homeowners"
                description="See your home's condition in plain language. Choose what to fix and compare contractor bids."
              />
              <FeatureCard
                icon={<Wrench className="h-8 w-8" />}
                title="Contractors"
                description="Receive verified scope items matched to your trade. Submit line-item proposals backed by inspection data."
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8" />}
                title="Trust Layer"
                description="Every issue traced to a photo-backed observation. No guesswork, no inflated scopes."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          PropIntel &mdash; Florida-first property intelligence.
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-6">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
