import 'dotenv/config'
// prisma/seed-dev-flow.ts
//
// Creates comprehensive dev data demonstrating the full platform flow:
// - 4 role users (admin, inspector, homeowner, contractor) with Supabase Auth accounts
// - Property with completed inspection + observations + issues
// - Project in BIDDING status with locked scope
// - Contractor proposal submitted
//
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-dev-flow.ts

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const DEV_PASSWORD = 'password123'

type DevUser = {
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'INSPECTOR' | 'HOMEOWNER' | 'CONTRACTOR'
}

const DEV_USERS: DevUser[] = [
  { email: 'admin@propintel.dev', firstName: 'Sarah', lastName: 'Admin', role: 'ADMIN' },
  { email: 'inspector@propintel.dev', firstName: 'John', lastName: 'Inspector', role: 'INSPECTOR' },
  { email: 'homeowner@propintel.dev', firstName: 'Jane', lastName: 'Homeowner', role: 'HOMEOWNER' },
  { email: 'contractor@propintel.dev', firstName: 'Mike', lastName: 'Contractor', role: 'CONTRACTOR' },
]

async function ensureSupabaseUser(email: string, password: string, metadata: Record<string, string>): Promise<string> {
  // Try to find existing user
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
  const existing = users?.find(u => u.email === email)

  if (existing) {
    console.log(`  Found existing Supabase user: ${email}`)
    return existing.id
  }

  // Create new user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) {
    throw new Error(`Failed to create Supabase user ${email}: ${error.message}`)
  }

  console.log(`  Created Supabase user: ${email}`)
  return data.user.id
}

async function main() {
  console.log('=== Dev Flow Seed ===\n')

  // ============================================================
  // 1. CREATE USERS (Supabase Auth + Database)
  // ============================================================
  console.log('1. Creating dev users...')
  const userMap = new Map<string, string>() // role -> db user id

  for (const devUser of DEV_USERS) {
    const supabaseId = await ensureSupabaseUser(devUser.email, DEV_PASSWORD, {
      role: devUser.role,
      first_name: devUser.firstName,
      last_name: devUser.lastName,
    })

    const dbUser = await prisma.user.upsert({
      where: { email: devUser.email },
      update: { supabase_id: supabaseId, first_name: devUser.firstName, last_name: devUser.lastName },
      create: {
        supabase_id: supabaseId,
        email: devUser.email,
        role: devUser.role,
        first_name: devUser.firstName,
        last_name: devUser.lastName,
        email_verified: true,
      },
    })
    userMap.set(devUser.role, dbUser.id)
    console.log(`  ${devUser.role}: ${devUser.email} (password: ${DEV_PASSWORD})`)
  }

  const homeownerId = userMap.get('HOMEOWNER')!
  const inspectorId = userMap.get('INSPECTOR')!
  const contractorId = userMap.get('CONTRACTOR')!
  const adminId = userMap.get('ADMIN')!

  // ============================================================
  // 2. CREATE CONTRACTOR PROFILE
  // ============================================================
  console.log('\n2. Creating contractor profile...')
  await prisma.contractorProfile.upsert({
    where: { user_id: contractorId },
    update: {},
    create: {
      user_id: contractorId,
      company_name: 'Palm Beach Pro Repairs',
      license_number: 'CBC1234567',
      trade_categories: ['Roofing', 'Electrical', 'Plumbing', 'General'],
      master_format_codes: ['07-31-13', '07-62-00', '26-24-16', '26-27-26', '22-34-00', '09-29-00'],
      service_radius_miles: 50,
      status: 'ACTIVE',
      bio: 'Full-service general contractor specializing in residential repairs and renovations in South Florida.',
      years_experience: 15,
      verified_at: new Date(),
      verified_by_id: adminId,
    },
  })
  console.log('  Contractor profile created (ACTIVE)')

  // ============================================================
  // 3. CREATE PROPERTY
  // ============================================================
  console.log('\n3. Creating property...')
  const property = await prisma.property.upsert({
    where: { id: 'demo-property-1' },
    update: {},
    create: {
      id: 'demo-property-1',
      owner_id: homeownerId,
      address_line1: '456 Ocean Drive',
      city: 'West Palm Beach',
      state: 'FL',
      zip_code: '33401',
      county: 'Palm Beach',
      latitude: 26.7153,
      longitude: -80.0534,
      year_built: 2003,
      square_footage: 2800,
      property_type: 'SINGLE_FAMILY',
      bedrooms: 4,
      bathrooms: 3,
      has_pool: true,
      stories: 2,
      roof_type: 'Asphalt Shingle',
      construction_type: 'CBS',
    },
  })
  console.log(`  Property: ${property.address_line1}, ${property.city}`)

  // ============================================================
  // 4. CREATE COMPLETED INSPECTION WITH SECTIONS
  // ============================================================
  console.log('\n4. Creating completed inspection...')
  const inspectionDate = new Date()
  inspectionDate.setDate(inspectionDate.getDate() - 7)

  const inspection = await prisma.inspection.upsert({
    where: { id: 'demo-inspection-1' },
    update: {},
    create: {
      id: 'demo-inspection-1',
      property_id: property.id,
      inspector_id: inspectorId,
      status: 'APPROVED',
      scheduled_date: inspectionDate,
      started_at: inspectionDate,
      completed_at: inspectionDate,
      approved_at: new Date(inspectionDate.getTime() + 86400000),
      approved_by_id: adminId,
      notes: 'Full home inspection completed. Several items noted requiring attention.',
    },
  })
  console.log(`  Inspection: ${inspection.id} (APPROVED)`)

  // Get section templates for creating sections
  const templates = await prisma.sectionTemplate.findMany({ orderBy: { order_index: 'asc' } })
  const templateMap = new Map(templates.map(t => [t.name, t]))

  // Create sections for the inspection
  console.log('\n5. Creating inspection sections...')
  const sectionMap = new Map<string, string>() // section name -> section id

  for (const template of templates) {
    const section = await prisma.section.upsert({
      where: {
        inspection_id_template_id: {
          inspection_id: inspection.id,
          template_id: template.id,
        },
      },
      update: {},
      create: {
        inspection_id: inspection.id,
        template_id: template.id,
        order_index: template.order_index,
        is_complete: true,
      },
    })
    sectionMap.set(template.name, section.id)
  }
  console.log(`  Created ${templates.length} sections (all marked complete)`)

  // ============================================================
  // 5. CREATE OBSERVATIONS ACROSS MULTIPLE SECTIONS
  // ============================================================
  console.log('\n6. Creating observations...')

  type ObservationData = {
    sectionName: string
    component: string
    description_raw: string
    status: 'DEFICIENT' | 'FUNCTIONAL' | 'MAINTENANCE_NEEDED' | 'NOT_PRESENT' | 'NOT_INSPECTED'
    severity: 'SAFETY_HAZARD' | 'MAJOR_DEFECT' | 'MINOR_DEFECT' | 'COSMETIC' | 'INFORMATIONAL'
    urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' | 'MONITOR'
    location_detail?: string
  }

  const observations: ObservationData[] = [
    // Roof observations
    {
      sectionName: 'Roof',
      component: 'Shingles',
      description_raw: 'Multiple shingles lifting and cracked on the north slope. Granule loss observed in several areas. Approximately 5-7 shingles need replacement.',
      status: 'DEFICIENT',
      severity: 'MAJOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'North slope, near ridge',
    },
    {
      sectionName: 'Roof',
      component: 'Flashing',
      description_raw: 'Flashing around chimney is pulling away from the masonry. Sealant is cracked and deteriorated.',
      status: 'DEFICIENT',
      severity: 'MAJOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'Chimney base',
    },
    {
      sectionName: 'Roof',
      component: 'Gutters',
      description_raw: 'Gutters along the east side are sagging and have standing water. One downspout is disconnected.',
      status: 'DEFICIENT',
      severity: 'MINOR_DEFECT',
      urgency: 'LONG_TERM',
      location_detail: 'East side',
    },
    // Electrical observations
    {
      sectionName: 'Electrical',
      component: 'Main Panel',
      description_raw: 'Main electrical panel is a Federal Pacific Stab-Lok panel. These panels are known fire hazards. Double-tapped breakers observed on circuits 5 and 12.',
      status: 'DEFICIENT',
      severity: 'SAFETY_HAZARD',
      urgency: 'IMMEDIATE',
      location_detail: 'Garage',
    },
    {
      sectionName: 'Electrical',
      component: 'GFCI Outlets',
      description_raw: 'GFCI outlets in master bathroom and kitchen not tripping when tested. Two exterior outlets lack GFCI protection.',
      status: 'DEFICIENT',
      severity: 'SAFETY_HAZARD',
      urgency: 'IMMEDIATE',
      location_detail: 'Master bath, kitchen, exterior',
    },
    {
      sectionName: 'Electrical',
      component: 'Outlets',
      description_raw: 'Three outlets in living room show reverse polarity. One outlet in bedroom 3 has open ground.',
      status: 'DEFICIENT',
      severity: 'MINOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'Living room, Bedroom 3',
    },
    // Plumbing observations
    {
      sectionName: 'Plumbing',
      component: 'Water Heater',
      description_raw: 'Water heater is 14 years old (manufactured 2012). Minor corrosion at base. TPR valve discharge pipe not routed to exterior.',
      status: 'MAINTENANCE_NEEDED',
      severity: 'MINOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'Utility room',
    },
    {
      sectionName: 'Plumbing',
      component: 'Faucets',
      description_raw: 'Kitchen faucet dripping at base when running. Guest bathroom faucet handle loose.',
      status: 'DEFICIENT',
      severity: 'COSMETIC',
      urgency: 'LONG_TERM',
      location_detail: 'Kitchen, Guest bath',
    },
    // HVAC observations
    {
      sectionName: 'HVAC',
      component: 'AC Unit',
      description_raw: 'AC system is cooling but showing 18 degree temperature differential (high). Unit is 12 years old. Condenser fins are bent in several areas.',
      status: 'MAINTENANCE_NEEDED',
      severity: 'MINOR_DEFECT',
      urgency: 'LONG_TERM',
      location_detail: 'Exterior east side',
    },
    {
      sectionName: 'HVAC',
      component: 'Condensate Drain',
      description_raw: 'Condensate drain line shows algae buildup. No safety float switch installed.',
      status: 'DEFICIENT',
      severity: 'MINOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'Air handler closet',
    },
    // Pool observations
    {
      sectionName: 'Pool / Spa',
      component: 'Safety Fence/Barrier',
      description_raw: 'Pool fence gate self-closing mechanism is broken. Gate does not self-latch. Two fence panels have damaged mesh.',
      status: 'DEFICIENT',
      severity: 'SAFETY_HAZARD',
      urgency: 'IMMEDIATE',
      location_detail: 'Pool area west gate',
    },
    {
      sectionName: 'Pool / Spa',
      component: 'Pool Pump',
      description_raw: 'Pool pump making grinding noise. Minor leak at pump seal. Flow rate appears reduced.',
      status: 'DEFICIENT',
      severity: 'MINOR_DEFECT',
      urgency: 'SHORT_TERM',
      location_detail: 'Pool equipment pad',
    },
    // Interior observations
    {
      sectionName: 'Interior',
      component: 'Drywall',
      description_raw: 'Water stain on ceiling in bedroom 2, approximately 2x3 feet. No active moisture detected. Likely from old roof leak.',
      status: 'DEFICIENT',
      severity: 'COSMETIC',
      urgency: 'LONG_TERM',
      location_detail: 'Bedroom 2 ceiling',
    },
    // Foundation observation
    {
      sectionName: 'Foundation / Structure',
      component: 'Foundation Cracks',
      description_raw: 'Hairline crack observed in garage slab, approximately 4 feet long. No displacement. Appears to be shrinkage crack.',
      status: 'DEFICIENT',
      severity: 'MINOR_DEFECT',
      urgency: 'MONITOR',
      location_detail: 'Garage slab, north wall',
    },
  ]

  const observationIds: string[] = []

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i]
    const sectionId = sectionMap.get(obs.sectionName)
    if (!sectionId) {
      console.log(`  Skipping: no section for ${obs.sectionName}`)
      continue
    }

    const created = await prisma.observation.create({
      data: {
        section_id: sectionId,
        component: obs.component,
        description_raw: obs.description_raw,
        status: obs.status,
        severity: obs.severity,
        urgency: obs.urgency,
        location_detail: obs.location_detail,
        order_index: i,
      },
    })
    observationIds.push(created.id)
    console.log(`  [${obs.sectionName}] ${obs.component}: ${obs.status} / ${obs.severity}`)
  }

  // ============================================================
  // 6. GENERATE ISSUES FROM RULES ENGINE (manual matching)
  // ============================================================
  console.log('\n7. Generating issues from defect dictionary...')

  // Look up defect dictionary matches for our observations
  const allObservations = await prisma.observation.findMany({
    where: { id: { in: observationIds } },
    include: {
      section: { include: { template: true } },
    },
  })

  let issueCount = 0
  const issueIds: string[] = []

  for (const obs of allObservations) {
    // Try exact match in defect dictionary
    const dictEntry = await prisma.defectDictionary.findFirst({
      where: {
        section_template_id: obs.section.template_id,
        component_match: obs.component,
        condition_match: obs.status,
        is_active: true,
        ...(obs.severity === 'SAFETY_HAZARD' ? { severity_match: 'SAFETY_HAZARD' } : {}),
      },
    })

    // Fallback: try without severity_match
    const entry = dictEntry || await prisma.defectDictionary.findFirst({
      where: {
        section_template_id: obs.section.template_id,
        component_match: obs.component,
        condition_match: obs.status,
        is_active: true,
        severity_match: null,
      },
    })

    if (entry) {
      const severityMap: Record<number, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
        4: 'CRITICAL',
        3: 'HIGH',
        2: 'MEDIUM',
        1: 'LOW',
      }

      const issue = await prisma.issue.create({
        data: {
          observation_id: obs.id,
          inspection_id: inspection.id,
          property_id: property.id,
          normalized_title: entry.normalized_title,
          normalized_description: entry.normalized_description,
          homeowner_description: entry.homeowner_description,
          master_format_code: entry.master_format_code,
          trade_category: entry.trade_category,
          severity_score: entry.default_severity_score,
          severity_label: severityMap[entry.default_severity_score] || 'MEDIUM',
          risk_category: entry.risk_category,
          urgency: obs.urgency,
          is_safety_hazard: entry.is_safety_hazard,
          insurance_relevant: entry.insurance_relevant,
        },
      })
      issueIds.push(issue.id)
      issueCount++
      console.log(`  Issue: ${entry.normalized_title} (${severityMap[entry.default_severity_score]})`)
    } else {
      console.log(`  No match: ${obs.section.template.name} / ${obs.component} / ${obs.status}`)
    }
  }
  console.log(`  Total issues generated: ${issueCount}`)

  // ============================================================
  // 7. CREATE PROJECT IN BIDDING STATUS
  // ============================================================
  console.log('\n8. Creating project with locked scope...')

  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      property_id: property.id,
      owner_id: homeownerId,
      title: 'Pre-Purchase Repairs — 456 Ocean Drive',
      intent_summary: 'Addressing critical safety items and major defects found during the home inspection before closing.',
      intent_tags: ['pre_purchase', 'safety', 'roof_repair'],
      status: 'BIDDING',
      scope_locked_at: new Date(),
    },
  })
  console.log(`  Project: ${project.title} (BIDDING)`)

  // Create scope items from issues (excluding suppressed ones)
  console.log('\n9. Creating scope items...')
  const issues = await prisma.issue.findMany({
    where: { id: { in: issueIds } },
    orderBy: { severity_score: 'desc' },
  })

  const scopeItemIds: string[] = []
  let scopeIndex = 0

  for (const issue of issues) {
    // Suppress low-severity cosmetic items
    const isSuppressed = issue.severity_score === 1

    const scopeItem = await prisma.scopeItem.create({
      data: {
        project_id: project.id,
        issue_id: issue.id,
        title: issue.normalized_title,
        description: issue.normalized_description,
        trade_category: issue.trade_category,
        master_format_code: issue.master_format_code,
        is_suppressed: isSuppressed,
        order_index: scopeIndex++,
      },
    })
    scopeItemIds.push(scopeItem.id)
    console.log(`  ${isSuppressed ? '[SUPPRESSED]' : '[ACTIVE]'} ${issue.normalized_title}`)
  }

  // Create scope snapshot
  const activeScopeItems = await prisma.scopeItem.findMany({
    where: { project_id: project.id, is_suppressed: false },
    orderBy: { order_index: 'asc' },
  })

  const snapshot = await prisma.scopeSnapshot.create({
    data: {
      project_id: project.id,
      version: 1,
      scope_data: JSON.parse(JSON.stringify(activeScopeItems)),
      is_active: true,
    },
  })
  console.log(`  Scope snapshot v${snapshot.version} created (${activeScopeItems.length} active items)`)

  // ============================================================
  // 8. CREATE CONTRACTOR PROPOSAL
  // ============================================================
  console.log('\n10. Creating contractor proposal...')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const proposal = await prisma.proposal.upsert({
    where: {
      project_id_contractor_id_scope_snapshot_id: {
        project_id: project.id,
        contractor_id: contractorId,
        scope_snapshot_id: snapshot.id,
      },
    },
    update: {},
    create: {
      project_id: project.id,
      scope_snapshot_id: snapshot.id,
      contractor_id: contractorId,
      total_amount: 0, // Will be calculated from line items
      status: 'SUBMITTED',
      notes: 'We can start within 2 weeks of acceptance. All work comes with a 1-year warranty. Licensed and insured in Palm Beach County.',
      estimated_start_date: new Date(Date.now() + 14 * 86400000),
      estimated_duration_days: 21,
      expires_at: expiresAt,
      submitted_at: new Date(),
    },
  })

  // Create proposal line items with realistic pricing
  type LineItemPrice = { title: string; cost: number }
  const priceGuide: Record<string, number> = {
    'Asphalt Shingle Repair/Replacement': 1200,
    'Roof Flashing Repair': 650,
    'Gutter Repair/Replacement': 450,
    'Electrical Panel Replacement': 3500,
    'GFCI Outlet Installation/Repair': 800,
    'Electrical Outlet Repair': 350,
    'Water Heater Replacement': 1800,
    'Faucet Repair/Replacement': 250,
    'AC System Replacement': 2200,
    'Condensate Drain Repair': 275,
    'Pool Safety Barrier Repair': 1100,
    'Pool Pump Repair/Replacement': 900,
    'Drywall Repair': 400,
    'Foundation Crack Assessment': 500,
  }

  let totalAmount = 0

  for (const scopeItem of activeScopeItems) {
    const cost = priceGuide[scopeItem.title] || 500
    totalAmount += cost

    await prisma.proposalItem.upsert({
      where: {
        proposal_id_scope_item_id: {
          proposal_id: proposal.id,
          scope_item_id: scopeItem.id,
        },
      },
      update: {},
      create: {
        proposal_id: proposal.id,
        scope_item_id: scopeItem.id,
        line_item_cost: cost,
        notes: `Standard ${scopeItem.trade_category.toLowerCase()} scope.`,
      },
    })
    console.log(`  $${cost.toLocaleString()} — ${scopeItem.title}`)
  }

  // Update proposal total
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { total_amount: totalAmount },
  })
  console.log(`  Total proposal: $${totalAmount.toLocaleString()}`)

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=== Dev Flow Seed Complete ===')
  console.log(`  Users: 4 (admin, inspector, homeowner, contractor)`)
  console.log(`  Password for all: ${DEV_PASSWORD}`)
  console.log(`  Property: ${property.address_line1}`)
  console.log(`  Inspection: APPROVED with ${observations.length} observations`)
  console.log(`  Issues: ${issueCount} generated`)
  console.log(`  Project: ${project.title} (BIDDING)`)
  console.log(`  Scope Items: ${activeScopeItems.length} active, ${scopeItemIds.length - activeScopeItems.length} suppressed`)
  console.log(`  Proposal: $${totalAmount.toLocaleString()} (SUBMITTED)`)
  console.log('\nLogin credentials:')
  for (const u of DEV_USERS) {
    console.log(`  ${u.role}: ${u.email} / ${DEV_PASSWORD}`)
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
