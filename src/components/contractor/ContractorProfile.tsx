'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Building,
  FileText,
  Shield,
  MapPin,
  Briefcase,
  Save,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TRADE_CATEGORIES, CONTRACTOR_STATUS_DISPLAY } from '@/types/contractor'
import type { ContractorProfileFull } from '@/types/contractor'
import type { ContractorAccountStatus } from '@prisma/client'

type ContractorProfileProps = {
  userId: string
}

export function ContractorProfile({ userId }: ContractorProfileProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<ContractorProfileFull | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseImageUrl, setLicenseImageUrl] = useState('')
  const [insuranceCertUrl, setInsuranceCertUrl] = useState('')
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [serviceRadius, setServiceRadius] = useState(50)
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState<number | ''>('')

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/contractor/profile?user_id=${userId}`)
        if (response.status === 404) {
          // No profile yet, that's OK
          setIsLoading(false)
          return
        }
        if (!response.ok) throw new Error('Failed to fetch profile')
        const data = await response.json()
        setProfile(data)

        // Populate form
        setCompanyName(data.company_name)
        setLicenseNumber(data.license_number ?? '')
        setLicenseImageUrl(data.license_image_url ?? '')
        setInsuranceCertUrl(data.insurance_cert_url ?? '')
        setSelectedTrades(data.trade_categories)
        setServiceRadius(data.service_radius_miles)
        setBio(data.bio ?? '')
        setYearsExperience(data.years_experience ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const handleTradeToggle = (trade: string) => {
    setSelectedTrades((prev) =>
      prev.includes(trade)
        ? prev.filter((t) => t !== trade)
        : [...prev, trade]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Get MasterFormat codes for selected trades
      const masterFormatCodes = TRADE_CATEGORIES
        .filter((t) => selectedTrades.includes(t.value))
        .map((t) => t.masterFormat)

      const response = await fetch('/api/contractor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          company_name: companyName,
          license_number: licenseNumber || null,
          license_image_url: licenseImageUrl || null,
          insurance_cert_url: insuranceCertUrl || null,
          trade_categories: selectedTrades,
          master_format_codes: masterFormatCodes,
          service_radius_miles: serviceRadius,
          bio: bio || null,
          years_experience: yearsExperience || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      const data = await response.json()
      setProfile(data)
      setSuccess(true)

      // Navigate to dashboard after successful save
      setTimeout(() => {
        router.push('/contractor')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const statusConfig = profile?.status
    ? CONTRACTOR_STATUS_DISPLAY[profile.status as ContractorAccountStatus]
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contractor Profile</h1>
        <p className="text-gray-500 mt-1">
          {profile
            ? 'Update your company information and trade specializations'
            : 'Complete your profile to start receiving project invitations'}
        </p>
      </div>

      {/* Status banner */}
      {statusConfig && (
        <div className={`p-4 rounded-lg ${statusConfig.bgColor} border`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 ${statusConfig.color} mt-0.5`} />
            <div>
              <p className={`font-medium ${statusConfig.color}`}>
                Account Status: {statusConfig.label}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {statusConfig.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min={0}
                  max={100}
                  value={yearsExperience}
                  onChange={(e) =>
                    setYearsExperience(e.target.value ? parseInt(e.target.value) : '')
                  }
                  placeholder="e.g., 10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                <Input
                  id="serviceRadius"
                  type="number"
                  min={1}
                  max={500}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(parseInt(e.target.value) || 50)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Company Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell homeowners about your company, specializations, and what sets you apart..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* License & Insurance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              License & Insurance
            </CardTitle>
            <CardDescription>
              Provide your license and insurance information for verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g., CBC1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseImageUrl">License Image URL</Label>
              <Input
                id="licenseImageUrl"
                type="url"
                value={licenseImageUrl}
                onChange={(e) => setLicenseImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500">
                Upload your license image to cloud storage and paste the URL here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insuranceCertUrl">Insurance Certificate URL</Label>
              <Input
                id="insuranceCertUrl"
                type="url"
                value={insuranceCertUrl}
                onChange={(e) => setInsuranceCertUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500">
                Upload your insurance certificate to cloud storage and paste the URL here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trade Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Trade Categories *
            </CardTitle>
            <CardDescription>
              Select the trades you service. You&apos;ll only see projects matching your trades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TRADE_CATEGORIES.map((trade) => (
                <div
                  key={trade.value}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTrades.includes(trade.value)
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleTradeToggle(trade.value)}
                >
                  <Checkbox
                    checked={selectedTrades.includes(trade.value)}
                    onCheckedChange={() => handleTradeToggle(trade.value)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{trade.label}</p>
                    <p className="text-xs text-gray-500">{trade.masterFormat}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedTrades.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                Please select at least one trade category
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error/Success messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Profile saved successfully! Redirecting to dashboard...
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving || selectedTrades.length === 0 || !companyName}
            className="min-w-[150px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
