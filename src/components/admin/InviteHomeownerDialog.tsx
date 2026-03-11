'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserPlus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type InviteHomeownerDialogProps = {
  onInvited?: () => void
  preselectedPropertyId?: string
}

type PropertyOption = {
  id: string
  address_line1: string
  city: string
  state: string
  owner_id: string | null
}

export function InviteHomeownerDialog({ onInvited, preselectedPropertyId }: InviteHomeownerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [propertyId, setPropertyId] = useState(preselectedPropertyId || '')

  // Result state (for showing invite link when email isn't configured)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Load unassigned properties when dialog opens
  useEffect(() => {
    if (!open) return

    async function loadProperties() {
      setIsLoadingProperties(true)
      try {
        const res = await fetch('/api/properties')
        if (res.ok) {
          const data = await res.json()
          const allProps = (data.data || data) as PropertyOption[]
          // Filter to unassigned properties only
          const unassigned = allProps.filter(p => !p.owner_id)
          setProperties(unassigned)
        }
      } catch (err) {
        console.error('Failed to load properties:', err)
      } finally {
        setIsLoadingProperties(false)
      }
    }

    loadProperties()
  }, [open])

  function resetForm() {
    setEmail('')
    setFirstName('')
    setLastName('')
    setPropertyId(preselectedPropertyId || '')
    setInviteLink(null)
    setCopied(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setInviteLink(null)

    try {
      const body: Record<string, unknown> = {
        email,
        first_name: firstName,
        last_name: lastName,
      }
      if (propertyId && propertyId !== 'none') {
        body.property_id = propertyId
      }

      const response = await fetch('/api/admin/invite-homeowner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to invite homeowner')
      }

      const result = await response.json()

      if (result.email_sent) {
        toast.success(`Invite sent to ${email}`)
        resetForm()
        setOpen(false)
        onInvited?.()
      } else if (result.invite_link) {
        // Email not configured — show the link for manual sharing
        setInviteLink(result.invite_link)
        toast.info('Homeowner created. Copy the invite link to share manually.')
        onInvited?.()
      } else {
        toast.success('Homeowner account created')
        resetForm()
        setOpen(false)
        onInvited?.()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite homeowner')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS contexts
      toast.error('Unable to copy — please select and copy the link manually')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Homeowner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Homeowner</DialogTitle>
          <DialogDescription>
            Create a homeowner account and send them an email to view their property assessment.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          // Show invite link for manual sharing
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Email service not configured. Share this link with the homeowner manually.
            </div>
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { resetForm(); setOpen(false) }}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inv-first-name">First Name *</Label>
                <Input
                  id="inv-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-last-name">Last Name *</Label>
                <Input
                  id="inv-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-email">Email *</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="homeowner@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-property">Assign to Property (optional)</Label>
              {isLoadingProperties ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading properties...
                </div>
              ) : (
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger id="inv-property">
                    <SelectValue placeholder="No property assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No property assigned</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.address_line1}, {p.city} {p.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Only properties without an owner are shown.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!email || !firstName || !lastName || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
