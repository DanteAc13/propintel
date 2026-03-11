'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type DictEntry = {
  id: string
  section_template_id: string
  component_match: string
  condition_match: string
  severity_match: string | null
  normalized_title: string
  normalized_description: string
  homeowner_description: string
  master_format_code: string
  trade_category: string
  default_severity_score: number
  risk_category: string | null
  is_safety_hazard: boolean
  insurance_relevant: boolean
  is_active: boolean
  section_template: { name: string }
}

type TemplateOption = { id: string; name: string }

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  4: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  3: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  2: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'Low', color: 'bg-blue-100 text-blue-700' },
}

function EntryRow({
  entry,
  onSave,
}: {
  entry: DictEntry
  onSave: (id: string, data: Partial<DictEntry>) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    homeowner_description: entry.homeowner_description,
    default_severity_score: entry.default_severity_score,
    is_safety_hazard: entry.is_safety_hazard,
    trade_category: entry.trade_category,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(entry.id, form)
    setSaving(false)
    setEditing(false)
  }

  const sev = SEVERITY_LABELS[entry.default_severity_score]

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Badge variant="outline" className={sev.color}>
            {sev.label}
          </Badge>
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">
              {entry.normalized_title}
            </p>
            <p className="text-xs text-gray-500">
              {entry.section_template.name} &middot; {entry.component_match} &middot; {entry.trade_category}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entry.is_safety_hazard && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          {entry.master_format_code && (
            <span className="text-xs text-gray-400 font-mono">
              {entry.master_format_code}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3">
          {!editing ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                <div>
                  <p className="text-gray-500 text-xs">Condition</p>
                  <p className="text-gray-900">{entry.condition_match}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">CSI Code</p>
                  <p className="text-gray-900 font-mono">{entry.master_format_code}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Technical Description</p>
                <p className="text-sm text-gray-700">{entry.normalized_description}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Homeowner Description</p>
                <p className="text-sm text-gray-700">{entry.homeowner_description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setEditing(true) }}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </>
          ) : (
            <div className="space-y-3 mt-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <Label className="text-xs">Homeowner Description</Label>
                <Textarea
                  value={form.homeowner_description}
                  onChange={(e) => setForm({ ...form, homeowner_description: e.target.value })}
                  rows={2}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Trade Category</Label>
                  <Input
                    value={form.trade_category}
                    onChange={(e) => setForm({ ...form, trade_category: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Severity (1-4)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={form.default_severity_score}
                    onChange={(e) => setForm({ ...form, default_severity_score: parseInt(e.target.value) || 1 })}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_safety_hazard}
                  onChange={(e) => setForm({ ...form, is_safety_hazard: e.target.checked })}
                />
                Safety Hazard
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DefectDictionaryManager() {
  const [entries, setEntries] = useState<DictEntry[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [trades, setTrades] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [filterSection, setFilterSection] = useState('')
  const [filterTrade, setFilterTrade] = useState('')

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filterSection) params.set('section_template_id', filterSection)
      if (filterTrade) params.set('trade_category', filterTrade)

      const res = await fetch(`/api/admin/defect-dictionary?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data.entries)
      setTemplates(data.templates)
      setTrades(data.trades)
    } catch (err) {
      console.error('Failed to fetch dictionary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filterSection, filterTrade])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (id: string, data: Partial<DictEntry>) => {
    try {
      const res = await fetch(`/api/admin/defect-dictionary/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update')
      await fetchData()
    } catch (err) {
      console.error('Failed to save entry:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Defect Dictionary</h1>
        <p className="text-gray-500 mt-1">
          {entries.length} rules that match observations to standardized issues
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search components or titles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">All Sections</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">All Trades</option>
              {trades.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No matching entries found
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onSave={handleSave} />
          ))
        )}
      </div>
    </div>
  )
}
