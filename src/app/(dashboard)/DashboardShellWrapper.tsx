'use client'

import { DashboardShell } from '@/components/shared/DashboardShell'
import type { Role } from '@prisma/client'
import {
  LayoutDashboard,
  Home,
  FolderOpen,
  ClipboardCheck,
  Users,
  ShieldCheck,
  HardHat,
  FileText,
  UserCircle,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_BY_ROLE: Record<Role, { label: string; items: NavItem[] }> = {
  HOMEOWNER: {
    label: 'Homeowner',
    items: [
      { label: 'Dashboard', href: '/homeowner/dashboard', icon: LayoutDashboard },
      { label: 'My Properties', href: '/homeowner/properties', icon: Home },
      { label: 'My Projects', href: '/homeowner/projects', icon: FolderOpen },
    ],
  },
  INSPECTOR: {
    label: 'Inspector',
    items: [
      { label: 'Dashboard', href: '/inspector/dashboard', icon: LayoutDashboard },
      { label: 'Inspections', href: '/inspector/inspections', icon: ClipboardCheck },
    ],
  },
  CONTRACTOR: {
    label: 'Contractor',
    items: [
      { label: 'Dashboard', href: '/contractor/dashboard', icon: LayoutDashboard },
      { label: 'My Profile', href: '/contractor/profile', icon: UserCircle },
    ],
  },
  ADMIN: {
    label: 'Admin',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Inspections', href: '/admin/inspections', icon: ClipboardCheck },
      { label: 'Contractors', href: '/admin/contractors', icon: HardHat },
      { label: 'Users', href: '/admin/users', icon: Users },
    ],
  },
}

export function DashboardShellWrapper({
  children,
  role,
  userName,
  userEmail,
}: {
  children: React.ReactNode
  role: Role
  userName: string
  userEmail: string
}) {
  const config = NAV_BY_ROLE[role]

  return (
    <DashboardShell
      navItems={config.items}
      roleName={config.label}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </DashboardShell>
  )
}
