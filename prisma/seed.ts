import 'dotenv/config'
// prisma/seed.ts
// Seeds the database with:
// 1. SectionTemplates (the inspection sections)
// 2. DefectDictionary (the Rules Engine lookup table)
//
// Run with: npx prisma db seed
// Configured in package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
//
// Prisma 7 requires driver adapters for Supabase/PostgreSQL connections.
// Uses DIRECT_URL (session pooler port 5432) for non-pooled direct connection.

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, ObservationStatus, ObservationSeverity } from '@prisma/client'

// Create pg Pool with DIRECT_URL (session pooler, port 5432)
const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
})

// Create Prisma adapter and client
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })


// ============================================================
// SECTION TEMPLATES
// ============================================================

const sectionTemplates = [
  {
    name: 'Roof',
    description: 'Roof covering, flashing, drainage, penetrations, and structural components',
    icon: 'home',
    order_index: 1,
    default_components: [
      'Shingles', 'Flashing', 'Gutters', 'Downspouts', 'Soffit', 'Fascia',
      'Ridge Vent', 'Roof Penetrations', 'Chimney', 'Skylights', 'Flat Roof Membrane',
      'Tile Roof', 'Metal Roof', 'Roof Decking', 'Valleys'
    ],
  },
  {
    name: 'Exterior',
    description: 'Siding, trim, windows, doors, decks, porches, and exterior surfaces',
    icon: 'building',
    order_index: 2,
    default_components: [
      'Siding', 'Trim', 'Paint/Stain', 'Windows', 'Exterior Doors', 'Screens',
      'Deck', 'Porch', 'Patio', 'Stucco', 'Brick/Masonry', 'Railings',
      'Stairs', 'Garage Door', 'Hurricane Shutters', 'Impact Windows'
    ],
  },
  {
    name: 'Foundation / Structure',
    description: 'Foundation walls, slabs, crawlspace, structural framing, and load-bearing elements',
    icon: 'layers',
    order_index: 3,
    default_components: [
      'Foundation Wall', 'Slab', 'Crawlspace', 'Piers', 'Floor Joists',
      'Beams', 'Columns', 'Load-Bearing Walls', 'Headers', 'Foundation Cracks',
      'Settlement', 'Water Intrusion Signs', 'Termite Damage'
    ],
  },
  {
    name: 'Plumbing',
    description: 'Water supply, drainage, water heater, fixtures, and fuel distribution',
    icon: 'droplets',
    order_index: 4,
    default_components: [
      'Water Heater', 'Main Shutoff', 'Supply Lines', 'Drain Lines', 'Faucets',
      'Toilets', 'Showers/Tubs', 'Garbage Disposal', 'Water Pressure',
      'Hose Bibs', 'Sump Pump', 'Sewage Ejector', 'Gas Lines', 'Water Softener'
    ],
  },
  {
    name: 'Electrical',
    description: 'Service entrance, panels, branch circuits, outlets, switches, and grounding',
    icon: 'zap',
    order_index: 5,
    default_components: [
      'Main Panel', 'Sub Panel', 'Service Entrance', 'Breakers/Fuses',
      'Outlets', 'GFCI Outlets', 'AFCI Protection', 'Switches', 'Light Fixtures',
      'Wiring Type', 'Grounding', 'Bonding', 'Smoke Detectors', 'CO Detectors',
      'Ceiling Fans', 'Aluminum Wiring', 'Knob and Tube'
    ],
  },
  {
    name: 'HVAC',
    description: 'Heating, cooling, ductwork, thermostats, and ventilation systems',
    icon: 'thermometer',
    order_index: 6,
    default_components: [
      'AC Unit', 'Air Handler', 'Furnace', 'Heat Pump', 'Ductwork',
      'Thermostat', 'Condensate Drain', 'Refrigerant Lines', 'Filter',
      'Registers/Returns', 'Mini Split', 'Package Unit', 'AC Disconnect'
    ],
  },
  {
    name: 'Interior',
    description: 'Walls, ceilings, floors, doors, stairs, and general interior conditions',
    icon: 'layout',
    order_index: 7,
    default_components: [
      'Walls', 'Ceilings', 'Floors', 'Interior Doors', 'Stairs', 'Railings',
      'Drywall', 'Paint', 'Trim/Molding', 'Closets', 'Cabinets',
      'Countertops', 'Fireplace', 'Windows (Interior)'
    ],
  },
  {
    name: 'Insulation / Ventilation',
    description: 'Attic insulation, ventilation, vapor barriers, and energy efficiency',
    icon: 'wind',
    order_index: 8,
    default_components: [
      'Attic Insulation', 'Wall Insulation', 'Floor Insulation', 'Vapor Barrier',
      'Attic Ventilation', 'Bathroom Exhaust', 'Kitchen Exhaust', 'Dryer Vent',
      'Ridge Vent', 'Soffit Vents', 'Radiant Barrier'
    ],
  },
  {
    name: 'Appliances',
    description: 'Built-in appliances including kitchen, laundry, and utility equipment',
    icon: 'microwave',
    order_index: 9,
    default_components: [
      'Dishwasher', 'Range/Oven', 'Cooktop', 'Microwave', 'Refrigerator',
      'Washer', 'Dryer', 'Range Hood', 'Garbage Disposal', 'Trash Compactor'
    ],
  },
  {
    name: 'Garage',
    description: 'Garage structure, door, opener, fire separation, and storage',
    icon: 'warehouse',
    order_index: 10,
    default_components: [
      'Garage Door', 'Garage Door Opener', 'Safety Sensors', 'Auto-Reverse',
      'Fire Separation Wall', 'Fire-Rated Door', 'Floor', 'Ceiling',
      'Electrical', 'Stairs to Living Space'
    ],
  },
  {
    name: 'Pool / Spa',
    description: 'Pool structure, equipment, safety barriers, and spa components',
    icon: 'waves',
    order_index: 11,
    default_components: [
      'Pool Surface', 'Pool Deck', 'Pool Pump', 'Pool Filter', 'Pool Heater',
      'Pool Lighting', 'Safety Fence/Barrier', 'Self-Closing Gate', 'Spa/Hot Tub',
      'Pool Screen Enclosure', 'Skimmer', 'Timer', 'Chemical System'
    ],
  },
  {
    name: 'Grounds / Drainage',
    description: 'Grading, drainage, walkways, driveways, retaining walls, and landscaping',
    icon: 'trees',
    order_index: 12,
    default_components: [
      'Grading', 'Drainage', 'Driveway', 'Walkways', 'Retaining Walls',
      'Fencing', 'Landscaping', 'Irrigation', 'Septic System', 'Well',
      'French Drain', 'Swales'
    ],
  },
]

// ============================================================
// DEFECT DICTIONARY (Rules Engine Lookup Table)
// Top 100+ most common home inspection defects
// Based on InterNACHI most-reported defects data
// ============================================================

type DefectEntry = {
  sectionName: string
  component_match: string
  condition_match: ObservationStatus
  severity_match?: ObservationSeverity
  normalized_title: string
  normalized_description: string
  homeowner_description: string
  master_format_code: string
  trade_category: string
  default_severity_score: number
  risk_category?: string
  is_safety_hazard: boolean
  insurance_relevant: boolean
}

const defectDictionary: DefectEntry[] = [
  // ===== ROOF =====
  {
    sectionName: 'Roof',
    component_match: 'Shingles',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Asphalt Shingle Repair/Replacement',
    normalized_description: 'Asphalt shingles show signs of damage, deterioration, or missing sections requiring repair or full replacement.',
    homeowner_description: 'Some of your roof shingles are damaged or missing. This can lead to water leaks if not addressed.',
    master_format_code: '07-31-13',
    trade_category: 'Roofing',
    default_severity_score: 3,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Roof',
    component_match: 'Shingles',
    condition_match: 'MAINTENANCE_NEEDED' as ObservationStatus,
    normalized_title: 'Roof Shingle End-of-Life Assessment',
    normalized_description: 'Shingles showing granule loss, curling, or aging consistent with approaching end of useful life.',
    homeowner_description: 'Your roof shingles are aging and may need replacement within the next few years.',
    master_format_code: '07-31-13',
    trade_category: 'Roofing',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Roof',
    component_match: 'Flashing',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Roof Flashing Repair',
    normalized_description: 'Roof flashing is damaged, improperly installed, or deteriorated at penetrations, valleys, or wall intersections.',
    homeowner_description: 'The metal strips that seal joints on your roof are damaged, which can allow water to leak inside.',
    master_format_code: '07-62-00',
    trade_category: 'Roofing',
    default_severity_score: 3,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Roof',
    component_match: 'Gutters',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Gutter Repair/Replacement',
    normalized_description: 'Gutters are damaged, sagging, detached, or improperly draining water away from the structure.',
    homeowner_description: 'Your gutters need attention. Damaged gutters can cause water to pool near your foundation.',
    master_format_code: '07-71-00',
    trade_category: 'Roofing',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Roof',
    component_match: 'Tile Roof',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Roof Tile Repair/Replacement',
    normalized_description: 'Concrete or clay roof tiles are cracked, broken, displaced, or missing.',
    homeowner_description: 'Some of your roof tiles are damaged or out of place and need repair.',
    master_format_code: '07-32-00',
    trade_category: 'Roofing',
    default_severity_score: 3,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Roof',
    component_match: 'Flat Roof Membrane',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Flat Roof Membrane Repair',
    normalized_description: 'Flat roof membrane shows blistering, cracking, ponding, or separation at seams.',
    homeowner_description: 'The flat portion of your roof has damage that could lead to leaks.',
    master_format_code: '07-52-00',
    trade_category: 'Roofing',
    default_severity_score: 3,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },

  // ===== EXTERIOR =====
  {
    sectionName: 'Exterior',
    component_match: 'Siding',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Siding Repair/Replacement',
    normalized_description: 'Exterior siding shows damage, warping, rot, or gaps that compromise weather protection.',
    homeowner_description: 'Your home\'s siding has damage that should be repaired to protect against weather and moisture.',
    master_format_code: '07-46-00',
    trade_category: 'Siding',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Exterior',
    component_match: 'Stucco',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Stucco Repair',
    normalized_description: 'Stucco cladding shows cracking, delamination, or water staining indicating moisture intrusion.',
    homeowner_description: 'Your stucco has cracks or damage that could let moisture into the walls.',
    master_format_code: '09-24-00',
    trade_category: 'Stucco/Masonry',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Exterior',
    component_match: 'Windows',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Window Repair/Replacement',
    normalized_description: 'Windows show broken seals (fogging), cracked panes, failed hardware, or missing weatherstripping.',
    homeowner_description: 'Some windows are damaged or have broken seals, which affects energy efficiency and could allow moisture in.',
    master_format_code: '08-50-00',
    trade_category: 'Windows/Doors',
    default_severity_score: 2,
    risk_category: 'Energy Efficiency',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Exterior',
    component_match: 'Impact Windows',
    condition_match: 'NOT_PRESENT' as ObservationStatus,
    normalized_title: 'Impact Window Installation',
    normalized_description: 'Property lacks impact-rated windows or approved hurricane protection in a wind-borne debris region.',
    homeowner_description: 'Your home doesn\'t have hurricane impact windows, which may be required for insurance and storm protection.',
    master_format_code: '08-50-00',
    trade_category: 'Windows/Doors',
    default_severity_score: 2,
    risk_category: 'Wind Damage',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Exterior',
    component_match: 'Exterior Doors',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Exterior Door Repair/Replacement',
    normalized_description: 'Exterior doors show damage, poor sealing, rot, or hardware failure.',
    homeowner_description: 'An exterior door needs repair or replacement for proper sealing and security.',
    master_format_code: '08-14-00',
    trade_category: 'Windows/Doors',
    default_severity_score: 2,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Exterior',
    component_match: 'Deck',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'SAFETY_HAZARD' as ObservationSeverity,
    normalized_title: 'Deck Safety Repair',
    normalized_description: 'Deck shows structural concerns: loose railings, rotted framing, inadequate fastening, or unstable stairs.',
    homeowner_description: 'Your deck has safety concerns that need immediate attention — loose railings, rotted wood, or unstable structure.',
    master_format_code: '06-63-00',
    trade_category: 'Carpentry',
    default_severity_score: 4,
    risk_category: 'Structural',
    is_safety_hazard: true,
    insurance_relevant: false,
  },

  // ===== FOUNDATION / STRUCTURE =====
  {
    sectionName: 'Foundation / Structure',
    component_match: 'Foundation Wall',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'MAJOR_DEFECT' as ObservationSeverity,
    normalized_title: 'Foundation Crack Repair',
    normalized_description: 'Foundation walls show significant cracking (>1/4 inch), displacement, or evidence of ongoing movement.',
    homeowner_description: 'There are significant cracks in your foundation that should be evaluated and repaired by a structural specialist.',
    master_format_code: '03-01-00',
    trade_category: 'Structural',
    default_severity_score: 4,
    risk_category: 'Structural',
    is_safety_hazard: true,
    insurance_relevant: true,
  },
  {
    sectionName: 'Foundation / Structure',
    component_match: 'Foundation Cracks',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Foundation Crack Assessment',
    normalized_description: 'Cracks observed in foundation requiring evaluation for structural significance vs cosmetic nature.',
    homeowner_description: 'Cracks were found in your foundation. Most small cracks are normal, but these should be evaluated by a professional.',
    master_format_code: '03-01-00',
    trade_category: 'Structural',
    default_severity_score: 3,
    risk_category: 'Structural',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Foundation / Structure',
    component_match: 'Water Intrusion Signs',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Foundation Water Intrusion Remediation',
    normalized_description: 'Evidence of water intrusion through foundation: efflorescence, staining, dampness, or active seepage.',
    homeowner_description: 'There are signs of water getting through your foundation. This needs to be addressed to prevent mold and structural damage.',
    master_format_code: '07-10-00',
    trade_category: 'Waterproofing',
    default_severity_score: 3,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: true,
  },
  {
    sectionName: 'Foundation / Structure',
    component_match: 'Termite Damage',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Termite Damage Repair & Treatment',
    normalized_description: 'Evidence of wood-destroying organisms: termite tubes, damaged wood, frass, or active infestation.',
    homeowner_description: 'Signs of termite activity or damage were found. Treatment and repair of damaged wood is recommended.',
    master_format_code: '06-05-00',
    trade_category: 'Pest Control',
    default_severity_score: 3,
    risk_category: 'Structural',
    is_safety_hazard: false,
    insurance_relevant: true,
  },

  // ===== PLUMBING =====
  {
    sectionName: 'Plumbing',
    component_match: 'Water Heater',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Water Heater Repair',
    normalized_description: 'Water heater shows signs of corrosion, leaking, improper venting, or safety device failure.',
    homeowner_description: 'Your water heater has issues that need repair, such as leaks, corrosion, or safety concerns.',
    master_format_code: '22-34-00',
    trade_category: 'Plumbing',
    default_severity_score: 3,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Plumbing',
    component_match: 'Water Heater',
    condition_match: 'MAINTENANCE_NEEDED' as ObservationStatus,
    normalized_title: 'Water Heater Replacement',
    normalized_description: 'Water heater approaching or past typical useful life (8-12 years). Replacement recommended.',
    homeowner_description: 'Your water heater is aging and will likely need replacement soon.',
    master_format_code: '22-34-00',
    trade_category: 'Plumbing',
    default_severity_score: 2,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Plumbing',
    component_match: 'Drain Lines',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Drain Line Repair',
    normalized_description: 'Drain lines show slow drainage, leaks, or improper slope indicating blockage or damage.',
    homeowner_description: 'Your drain pipes have issues — slow draining or leaks that need plumbing attention.',
    master_format_code: '22-13-00',
    trade_category: 'Plumbing',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Plumbing',
    component_match: 'Faucets',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Faucet Repair/Replacement',
    normalized_description: 'Faucets show leaks, corrosion, low flow, or hardware failure.',
    homeowner_description: 'Some faucets are leaking or not working properly and should be repaired.',
    master_format_code: '22-41-00',
    trade_category: 'Plumbing',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Plumbing',
    component_match: 'Toilets',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Toilet Repair/Replacement',
    normalized_description: 'Toilets show running, leaking at base, loose mounting, or internal component failure.',
    homeowner_description: 'A toilet needs repair — it may be running, leaking, or loose.',
    master_format_code: '22-42-00',
    trade_category: 'Plumbing',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },

  // ===== ELECTRICAL =====
  {
    sectionName: 'Electrical',
    component_match: 'Main Panel',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'SAFETY_HAZARD' as ObservationSeverity,
    normalized_title: 'Electrical Panel Replacement',
    normalized_description: 'Main electrical panel shows safety hazards: Federal Pacific, Zinsco, double-tapped breakers, scorching, or code violations.',
    homeowner_description: 'Your electrical panel has safety issues and should be replaced. This is a high-priority safety concern.',
    master_format_code: '26-24-16',
    trade_category: 'Electrical',
    default_severity_score: 4,
    risk_category: 'Fire Hazard',
    is_safety_hazard: true,
    insurance_relevant: true,
  },
  {
    sectionName: 'Electrical',
    component_match: 'Main Panel',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Electrical Panel Repair',
    normalized_description: 'Electrical panel shows deficiencies: missing knockouts, improper labeling, or minor code issues.',
    homeowner_description: 'Your electrical panel needs some repairs to meet safety standards.',
    master_format_code: '26-24-16',
    trade_category: 'Electrical',
    default_severity_score: 2,
    risk_category: 'Fire Hazard',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Electrical',
    component_match: 'Outlets',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Electrical Outlet Repair',
    normalized_description: 'Outlets show reverse polarity, open grounds, missing covers, or non-functional receptacles.',
    homeowner_description: 'Some electrical outlets aren\'t wired correctly or need repair for safety.',
    master_format_code: '26-27-26',
    trade_category: 'Electrical',
    default_severity_score: 2,
    risk_category: 'Fire Hazard',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Electrical',
    component_match: 'GFCI Outlets',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'GFCI Outlet Installation/Repair',
    normalized_description: 'GFCI protection missing or non-functional in required locations (kitchen, bath, garage, exterior, pool).',
    homeowner_description: 'Special safety outlets (GFCI) are missing or not working in areas near water. This is a safety requirement.',
    master_format_code: '26-27-26',
    trade_category: 'Electrical',
    default_severity_score: 3,
    risk_category: 'Electrical Shock',
    is_safety_hazard: true,
    insurance_relevant: false,
  },
  {
    sectionName: 'Electrical',
    component_match: 'GFCI Outlets',
    condition_match: 'NOT_PRESENT' as ObservationStatus,
    normalized_title: 'GFCI Outlet Installation',
    normalized_description: 'GFCI protection absent in required locations per NEC code.',
    homeowner_description: 'Safety outlets (GFCI) need to be installed near water sources in your home.',
    master_format_code: '26-27-26',
    trade_category: 'Electrical',
    default_severity_score: 3,
    risk_category: 'Electrical Shock',
    is_safety_hazard: true,
    insurance_relevant: false,
  },
  {
    sectionName: 'Electrical',
    component_match: 'Aluminum Wiring',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'SAFETY_HAZARD' as ObservationSeverity,
    normalized_title: 'Aluminum Wiring Remediation',
    normalized_description: 'Single-strand aluminum branch circuit wiring present. Requires COPALUM or AlumiConn remediation.',
    homeowner_description: 'Your home has aluminum wiring which is a known fire risk. A licensed electrician should install special connectors to make it safe.',
    master_format_code: '26-05-00',
    trade_category: 'Electrical',
    default_severity_score: 4,
    risk_category: 'Fire Hazard',
    is_safety_hazard: true,
    insurance_relevant: true,
  },
  {
    sectionName: 'Electrical',
    component_match: 'Smoke Detectors',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Smoke Detector Installation/Repair',
    normalized_description: 'Smoke detectors missing, non-functional, or improperly located per code requirements.',
    homeowner_description: 'Smoke detectors need to be installed or replaced in required locations for fire safety.',
    master_format_code: '28-31-00',
    trade_category: 'Electrical',
    default_severity_score: 4,
    risk_category: 'Fire Hazard',
    is_safety_hazard: true,
    insurance_relevant: false,
  },
  {
    sectionName: 'Electrical',
    component_match: 'Smoke Detectors',
    condition_match: 'NOT_PRESENT' as ObservationStatus,
    normalized_title: 'Smoke Detector Installation',
    normalized_description: 'Required smoke detectors absent from bedrooms, hallways, or each level of the home.',
    homeowner_description: 'Smoke detectors are missing from required locations. This is a critical safety item.',
    master_format_code: '28-31-00',
    trade_category: 'Electrical',
    default_severity_score: 4,
    risk_category: 'Fire Hazard',
    is_safety_hazard: true,
    insurance_relevant: false,
  },

  // ===== HVAC =====
  {
    sectionName: 'HVAC',
    component_match: 'AC Unit',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'AC System Repair',
    normalized_description: 'Air conditioning unit shows performance issues, refrigerant leaks, electrical problems, or inadequate cooling.',
    homeowner_description: 'Your air conditioning system isn\'t working properly and needs repair.',
    master_format_code: '23-81-00',
    trade_category: 'HVAC',
    default_severity_score: 3,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'HVAC',
    component_match: 'AC Unit',
    condition_match: 'MAINTENANCE_NEEDED' as ObservationStatus,
    normalized_title: 'AC System Replacement',
    normalized_description: 'AC unit approaching or past useful life expectancy (15-20 years). Replacement recommended.',
    homeowner_description: 'Your AC unit is aging and will likely need replacement in the near future.',
    master_format_code: '23-81-00',
    trade_category: 'HVAC',
    default_severity_score: 2,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'HVAC',
    component_match: 'Ductwork',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Ductwork Repair/Sealing',
    normalized_description: 'HVAC ductwork shows disconnections, damage, inadequate insulation, or significant air leakage.',
    homeowner_description: 'Your air ducts have leaks or damage, which means you\'re losing conditioned air and wasting energy.',
    master_format_code: '23-31-00',
    trade_category: 'HVAC',
    default_severity_score: 2,
    risk_category: 'Energy Efficiency',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'HVAC',
    component_match: 'Condensate Drain',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Condensate Drain Repair',
    normalized_description: 'HVAC condensate drain line is clogged, improperly routed, or lacking safety float switch.',
    homeowner_description: 'The drain line from your AC needs repair. A clogged line can cause water damage.',
    master_format_code: '23-81-00',
    trade_category: 'HVAC',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },

  // ===== INTERIOR =====
  {
    sectionName: 'Interior',
    component_match: 'Drywall',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Drywall Repair',
    normalized_description: 'Drywall shows cracks, holes, water staining, or damage requiring patching and refinishing.',
    homeowner_description: 'There is drywall damage (cracks, holes, or stains) that should be repaired.',
    master_format_code: '09-29-00',
    trade_category: 'General',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Interior',
    component_match: 'Floors',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Flooring Repair/Replacement',
    normalized_description: 'Flooring shows damage, warping, loose tiles, or tripping hazards.',
    homeowner_description: 'Your flooring has damage or uneven areas that should be repaired.',
    master_format_code: '09-60-00',
    trade_category: 'Flooring',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Interior',
    component_match: 'Stairs',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'SAFETY_HAZARD' as ObservationSeverity,
    normalized_title: 'Stair Safety Repair',
    normalized_description: 'Stairs or railings present safety hazards: loose handrails, missing balusters, uneven risers, or inadequate headroom.',
    homeowner_description: 'Your stairs or railings have safety issues that need to be fixed to prevent falls.',
    master_format_code: '06-43-00',
    trade_category: 'Carpentry',
    default_severity_score: 4,
    risk_category: 'Fall Hazard',
    is_safety_hazard: true,
    insurance_relevant: false,
  },

  // ===== INSULATION / VENTILATION =====
  {
    sectionName: 'Insulation / Ventilation',
    component_match: 'Attic Insulation',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Attic Insulation Upgrade',
    normalized_description: 'Attic insulation is below recommended R-value for climate zone or has gaps/compression.',
    homeowner_description: 'Your attic doesn\'t have enough insulation, which means higher energy bills and less comfort.',
    master_format_code: '07-21-00',
    trade_category: 'Insulation',
    default_severity_score: 2,
    risk_category: 'Energy Efficiency',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Insulation / Ventilation',
    component_match: 'Bathroom Exhaust',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Bathroom Exhaust Fan Repair',
    normalized_description: 'Bathroom exhaust fan is non-functional, improperly vented (into attic), or inadequate CFM.',
    homeowner_description: 'Your bathroom exhaust fan isn\'t working properly, which can lead to moisture and mold problems.',
    master_format_code: '23-34-00',
    trade_category: 'HVAC',
    default_severity_score: 2,
    risk_category: 'Moisture/Mold',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Insulation / Ventilation',
    component_match: 'Attic Ventilation',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Attic Ventilation Improvement',
    normalized_description: 'Insufficient attic ventilation causing excessive heat buildup or moisture accumulation.',
    homeowner_description: 'Your attic needs better ventilation to prevent heat buildup and moisture problems.',
    master_format_code: '07-72-00',
    trade_category: 'Roofing',
    default_severity_score: 2,
    risk_category: 'Moisture/Mold',
    is_safety_hazard: false,
    insurance_relevant: false,
  },

  // ===== APPLIANCES =====
  {
    sectionName: 'Appliances',
    component_match: 'Dishwasher',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Dishwasher Repair/Replacement',
    normalized_description: 'Dishwasher shows leaks, drainage issues, or non-functional operation.',
    homeowner_description: 'Your dishwasher isn\'t working properly and needs repair or replacement.',
    master_format_code: '11-31-00',
    trade_category: 'Appliance',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Appliances',
    component_match: 'Range/Oven',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Range/Oven Repair',
    normalized_description: 'Range or oven shows burner failure, temperature inaccuracy, or gas connection concerns.',
    homeowner_description: 'Your range or oven needs repair — burners or heating elements aren\'t working correctly.',
    master_format_code: '11-31-00',
    trade_category: 'Appliance',
    default_severity_score: 2,
    is_safety_hazard: false,
    insurance_relevant: false,
  },

  // ===== GARAGE =====
  {
    sectionName: 'Garage',
    component_match: 'Fire Separation Wall',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Garage Fire Separation Repair',
    normalized_description: 'Garage-to-living-space fire separation compromised: holes, missing drywall, or non-fire-rated door.',
    homeowner_description: 'The fire barrier between your garage and living space has gaps that need to be sealed for safety.',
    master_format_code: '09-21-00',
    trade_category: 'General',
    default_severity_score: 3,
    risk_category: 'Fire Hazard',
    is_safety_hazard: true,
    insurance_relevant: false,
  },
  {
    sectionName: 'Garage',
    component_match: 'Garage Door Opener',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Garage Door Opener Repair',
    normalized_description: 'Garage door opener auto-reverse safety feature non-functional or opener is malfunctioning.',
    homeowner_description: 'Your garage door opener needs repair — the safety reverse feature isn\'t working correctly.',
    master_format_code: '08-36-00',
    trade_category: 'Garage Door',
    default_severity_score: 3,
    risk_category: 'Mechanical Hazard',
    is_safety_hazard: true,
    insurance_relevant: false,
  },

  // ===== POOL / SPA =====
  {
    sectionName: 'Pool / Spa',
    component_match: 'Safety Fence/Barrier',
    condition_match: 'DEFICIENT' as ObservationStatus,
    severity_match: 'SAFETY_HAZARD' as ObservationSeverity,
    normalized_title: 'Pool Safety Barrier Repair',
    normalized_description: 'Pool safety barrier does not meet code: damaged fence, non-self-closing gate, or inadequate height.',
    homeowner_description: 'Your pool safety fence or gate doesn\'t meet safety requirements. This is critical for child safety and insurance.',
    master_format_code: '13-11-00',
    trade_category: 'Pool',
    default_severity_score: 4,
    risk_category: 'Drowning Hazard',
    is_safety_hazard: true,
    insurance_relevant: true,
  },
  {
    sectionName: 'Pool / Spa',
    component_match: 'Safety Fence/Barrier',
    condition_match: 'NOT_PRESENT' as ObservationStatus,
    normalized_title: 'Pool Safety Barrier Installation',
    normalized_description: 'Pool lacks required safety barrier per Florida Building Code and local ordinances.',
    homeowner_description: 'A safety fence/barrier is required around your pool. This is a legal and insurance requirement.',
    master_format_code: '13-11-00',
    trade_category: 'Pool',
    default_severity_score: 4,
    risk_category: 'Drowning Hazard',
    is_safety_hazard: true,
    insurance_relevant: true,
  },
  {
    sectionName: 'Pool / Spa',
    component_match: 'Pool Pump',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Pool Pump Repair/Replacement',
    normalized_description: 'Pool pump shows noise, leaks, reduced flow, or electrical issues.',
    homeowner_description: 'Your pool pump needs attention — it may be leaking, noisy, or not circulating water properly.',
    master_format_code: '13-11-00',
    trade_category: 'Pool',
    default_severity_score: 2,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Pool / Spa',
    component_match: 'Pool Screen Enclosure',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Pool Screen Enclosure Repair',
    normalized_description: 'Pool screen enclosure shows torn screens, damaged frame, or structural concerns.',
    homeowner_description: 'Your pool screen enclosure has damage that should be repaired.',
    master_format_code: '13-11-00',
    trade_category: 'Screen Enclosure',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: true,
  },

  // ===== GROUNDS / DRAINAGE =====
  {
    sectionName: 'Grounds / Drainage',
    component_match: 'Grading',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Grading Correction',
    normalized_description: 'Ground slopes toward foundation, allowing water to pool and potentially intrude into structure.',
    homeowner_description: 'The ground around your home slopes the wrong way, directing water toward your foundation instead of away from it.',
    master_format_code: '31-22-00',
    trade_category: 'Landscaping',
    default_severity_score: 2,
    risk_category: 'Water Intrusion',
    is_safety_hazard: false,
    insurance_relevant: false,
  },
  {
    sectionName: 'Grounds / Drainage',
    component_match: 'Driveway',
    condition_match: 'DEFICIENT' as ObservationStatus,
    normalized_title: 'Driveway Repair',
    normalized_description: 'Driveway shows significant cracking, settling, or heaving creating trip hazards or drainage issues.',
    homeowner_description: 'Your driveway has cracks or uneven areas that should be repaired.',
    master_format_code: '32-12-00',
    trade_category: 'Concrete',
    default_severity_score: 1,
    is_safety_hazard: false,
    insurance_relevant: false,
  },
]

// ============================================================
// SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Section Templates
  console.log('📋 Creating section templates...')
  const templateMap = new Map<string, string>()

  for (const template of sectionTemplates) {
    const created = await prisma.sectionTemplate.upsert({
      where: { name: template.name },
      update: {
        description: template.description,
        icon: template.icon,
        order_index: template.order_index,
        default_components: template.default_components,
      },
      create: {
        name: template.name,
        description: template.description,
        icon: template.icon,
        order_index: template.order_index,
        default_components: template.default_components,
      },
    })
    templateMap.set(template.name, created.id)
    console.log(`  ✅ ${template.name} (${template.default_components.length} components)`)
  }

  // 2. Create Defect Dictionary entries
  console.log('\n📖 Creating defect dictionary...')
  let created = 0
  let skipped = 0

  for (const defect of defectDictionary) {
    const templateId = templateMap.get(defect.sectionName)
    if (!templateId) {
      console.log(`  ⚠️ Skipping: No template found for section "${defect.sectionName}"`)
      skipped++
      continue
    }

    await prisma.defectDictionary.upsert({
      where: {
        section_template_id_component_match_condition_match: {
          section_template_id: templateId,
          component_match: defect.component_match,
          condition_match: defect.condition_match,
        },
      },
      update: {
        severity_match: defect.severity_match || null,
        normalized_title: defect.normalized_title,
        normalized_description: defect.normalized_description,
        homeowner_description: defect.homeowner_description,
        master_format_code: defect.master_format_code,
        trade_category: defect.trade_category,
        default_severity_score: defect.default_severity_score,
        risk_category: defect.risk_category || null,
        is_safety_hazard: defect.is_safety_hazard,
        insurance_relevant: defect.insurance_relevant,
      },
      create: {
        section_template_id: templateId,
        component_match: defect.component_match,
        condition_match: defect.condition_match,
        severity_match: defect.severity_match || null,
        normalized_title: defect.normalized_title,
        normalized_description: defect.normalized_description,
        homeowner_description: defect.homeowner_description,
        master_format_code: defect.master_format_code,
        trade_category: defect.trade_category,
        default_severity_score: defect.default_severity_score,
        risk_category: defect.risk_category || null,
        is_safety_hazard: defect.is_safety_hazard,
        insurance_relevant: defect.insurance_relevant,
      },
    })
    created++
  }

  console.log(`  ✅ ${created} defect entries created/updated`)
  if (skipped > 0) console.log(`  ⚠️ ${skipped} entries skipped`)

  // 3. Create admin user (for development)
  console.log('\n👤 Creating dev admin user...')
  await prisma.user.upsert({
    where: { email: 'admin@propintel.dev' },
    update: {},
    create: {
      email: 'admin@propintel.dev',
      supabase_id: 'dev-admin-placeholder',
      role: 'ADMIN',
      first_name: 'Dev',
      last_name: 'Admin',
      email_verified: true,
    },
  })
  console.log('  ✅ Dev admin created')

  // 4. Create dev inspector
  console.log('\n👤 Creating dev inspector...')
  const inspector = await prisma.user.upsert({
    where: { email: 'inspector@propintel.dev' },
    update: {},
    create: {
      email: 'inspector@propintel.dev',
      supabase_id: 'dev-inspector-placeholder',
      role: 'INSPECTOR',
      first_name: 'John',
      last_name: 'Inspector',
      email_verified: true,
    },
  })
  console.log('  ✅ Dev inspector created')

  // 5. Create dev homeowner
  console.log('\n👤 Creating dev homeowner...')
  const homeowner = await prisma.user.upsert({
    where: { email: 'homeowner@propintel.dev' },
    update: {},
    create: {
      email: 'homeowner@propintel.dev',
      supabase_id: 'dev-homeowner-placeholder',
      role: 'HOMEOWNER',
      first_name: 'Jane',
      last_name: 'Homeowner',
      email_verified: true,
    },
  })
  console.log('  ✅ Dev homeowner created')

  // 6. Create sample property
  console.log('\n🏠 Creating sample property...')
  const property = await prisma.property.upsert({
    where: { id: 'sample-property-1' },
    update: {},
    create: {
      id: 'sample-property-1',
      owner_id: homeowner.id,
      address_line1: '123 Palm Beach Boulevard',
      city: 'West Palm Beach',
      state: 'FL',
      zip_code: '33401',
      county: 'Palm Beach',
      property_type: 'SINGLE_FAMILY',
      year_built: 2005,
      square_footage: 2400,
      bedrooms: 4,
      bathrooms: 2.5,
      has_pool: true,
    },
  })
  console.log('  ✅ Sample property created')

  // 7. Create sample inspection
  console.log('\n📋 Creating sample inspection...')
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  await prisma.inspection.upsert({
    where: { id: 'sample-inspection-1' },
    update: {},
    create: {
      id: 'sample-inspection-1',
      property_id: property.id,
      inspector_id: inspector.id,
      status: 'SCHEDULED',
      scheduled_date: tomorrow,
    },
  })
  console.log('  ✅ Sample inspection created (scheduled for tomorrow)')

  console.log('\n🎉 Seed complete!')
  console.log(`  📋 ${sectionTemplates.length} section templates`)
  console.log(`  📖 ${created} defect dictionary entries`)
  console.log(`  👤 3 users (admin, inspector, homeowner)`)
  console.log(`  🏠 1 sample property`)
  console.log(`  📋 1 sample inspection`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
