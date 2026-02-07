// src/lib/utils/permissions.ts
// Role-based access control helpers
//
// Based on the role-based access matrix from ARCHITECTURE.md

import type { Role } from '@prisma/client'

// Entity access rules
export const ACCESS_RULES = {
  Property: {
    HOMEOWNER: 'own',
    INSPECTOR: 'assigned',
    CONTRACTOR: 'none',
    ADMIN: 'all',
  },
  Inspection: {
    HOMEOWNER: 'own_property',
    INSPECTOR: 'assigned',
    CONTRACTOR: 'none',
    ADMIN: 'all',
  },
  Observation: {
    HOMEOWNER: 'none', // Sees Issues instead
    INSPECTOR: 'own_inspection',
    CONTRACTOR: 'none',
    ADMIN: 'all',
  },
  Issue: {
    HOMEOWNER: 'own_property',
    INSPECTOR: 'own_inspection',
    CONTRACTOR: 'matched_trade',
    ADMIN: 'all',
  },
  Project: {
    HOMEOWNER: 'own',
    INSPECTOR: 'none',
    CONTRACTOR: 'invited',
    ADMIN: 'all',
  },
  ScopeItem: {
    HOMEOWNER: 'own_project',
    INSPECTOR: 'none',
    CONTRACTOR: 'matched_trade',
    ADMIN: 'all',
  },
  Proposal: {
    HOMEOWNER: 'own_project_read',
    INSPECTOR: 'none',
    CONTRACTOR: 'own',
    ADMIN: 'all',
  },
} as const

export type EntityType = keyof typeof ACCESS_RULES

// Check if a role can access an entity type
export function canAccess(role: Role, entity: EntityType): boolean {
  const access = ACCESS_RULES[entity][role]
  return access !== 'none'
}

// Check if role has admin-level access
export function isAdmin(role: Role): boolean {
  return role === 'ADMIN'
}

// Get allowed dashboard routes for a role
export function getAllowedRoutes(role: Role): string[] {
  switch (role) {
    case 'HOMEOWNER':
      return [
        '/homeowner/dashboard',
        '/homeowner/property',
        '/homeowner/project',
      ]
    case 'INSPECTOR':
      return [
        '/inspector/dashboard',
        '/inspector/inspection',
      ]
    case 'CONTRACTOR':
      return [
        '/contractor/dashboard',
        '/contractor/project',
        '/contractor/proposal',
      ]
    case 'ADMIN':
      return [
        '/admin/dashboard',
        '/admin/inspections',
        '/admin/contractors',
        '/admin/users',
        // Admin can also access all other routes
        '/homeowner',
        '/inspector',
        '/contractor',
      ]
    default:
      return []
  }
}

// Check if a route is allowed for a role
export function isRouteAllowed(role: Role, pathname: string): boolean {
  const allowedRoutes = getAllowedRoutes(role)

  // Admin can access everything
  if (role === 'ADMIN') {
    return true
  }

  // Check if pathname starts with any allowed route
  return allowedRoutes.some((route) => pathname.startsWith(route))
}
