\# Property Intelligence \& Execution Platform — Architecture Specification



\## Document Purpose

This is the authoritative technical specification for building the platform. It synthesizes the product vision document and the Gemini architectural research into a single, actionable blueprint. Every technical decision is made. No ambiguity remains.



---



\## 1. WHAT THIS IS (One Paragraph, No Marketing)



A platform where the home inspection is the root data event. Inspectors capture structured observations in the field. A rules engine normalizes those observations into standardized issues mapped to construction trades via CSI MasterFormat. Homeowners see a simplified, trust-building view of their home's condition. They select issues to fix, creating scoped projects. Contractors see only the scope items relevant to their trade, backed by verified inspection data, and submit line-item proposals. The platform controls the entire flow from "what's wrong" to "who will fix it" to "at what price."



---



\## 2. TECH STACK (Final, Non-Negotiable)



| Layer | Technology | Justification |

|-------|-----------|---------------|

| \*\*Framework\*\* | Next.js 15 (App Router) | Full-stack monolith. SSR for homeowner pages, API routes for business logic, React for all dashboards. Claude Code agents work fastest in a single codebase. |

| \*\*Language\*\* | TypeScript (strict) | Type safety end-to-end. Prisma types flow to API routes to React components. |

| \*\*Database\*\* | PostgreSQL (via Supabase) | Deeply relational data. Supabase provides Postgres + Auth + Storage + RLS + Realtime. |

| \*\*ORM\*\* | Prisma | Schema-as-source-of-truth. Type-safe queries. Migration management. |

| \*\*Auth\*\* | Supabase Auth | Email/password for inspectors/contractors. Magic links for homeowners. Google OAuth optional. |

| \*\*Storage\*\* | Supabase Storage | Media buckets with RLS. Signed URLs for access control. |

| \*\*UI\*\* | TailwindCSS + shadcn/ui | Fast, consistent, accessible. Excellent Claude Code output quality. |

| \*\*Offline\*\* | Service Worker + IndexedDB (Dexie.js) | Inspector PWA for field use. Local-first capture, background sync. |

| \*\*Deployment\*\* | Vercel | Zero-config Next.js deployment. Preview deploys for PRs. |

| \*\*Monorepo\*\* | Single Next.js project | No monorepo tooling overhead. `/app` for routes, `/lib` for shared logic. |



\### What We Are NOT Using (and Why)

\- \*\*React Native\*\*: Too expensive to maintain. PWA gives installable app + offline + camera access.

\- \*\*Microservices\*\*: Premature. Rules engine is a module, not a service, until scale demands it.

\- \*\*Raw SQL\*\*: Prisma gives us migrations, type safety, and a readable schema file.

\- \*\*AWS/GCP directly\*\*: Supabase abstracts infrastructure. We focus on product, not DevOps.



---



\## 3. DATA MODEL (Complete Entity Specification)



\### 3.1 Enums



```

Role: HOMEOWNER | INSPECTOR | CONTRACTOR | ADMIN



InspectionStatus: SCHEDULED | IN\_PROGRESS | IN\_REVIEW | APPROVED | REJECTED



ObservationStatus: DEFICIENT | FUNCTIONAL | NOT\_INSPECTED | NOT\_PRESENT | MAINTENANCE\_NEEDED



ObservationSeverity: SAFETY\_HAZARD | MAJOR\_DEFECT | MINOR\_DEFECT | COSMETIC | INFORMATIONAL



Urgency: IMMEDIATE | SHORT\_TERM | LONG\_TERM | MONITOR



IssueSeverity: CRITICAL | HIGH | MEDIUM | LOW (1-4 numeric + label)



ProjectStatus: DRAFT | SCOPE\_LOCKED | BIDDING | ACTIVE | COMPLETED | CANCELLED



ProposalStatus: DRAFT | SUBMITTED | ACCEPTED | REJECTED | EXPIRED | OUTDATED



ContractorStatus: PENDING | ACTIVE | SUSPENDED | REJECTED



PropertyType: SINGLE\_FAMILY | CONDO | TOWNHOUSE | MULTI\_FAMILY | MOBILE\_HOME

```



\### 3.2 Entities (Detailed)



\#### User

\- id (UUID, PK)

\- email (unique)

\- role (Role enum) — one user = one role for MVP

\- first\_name, last\_name

\- phone

\- avatar\_url

\- email\_verified (boolean)

\- created\_at, updated\_at



\#### Property

\- id (UUID, PK)

\- owner\_id (FK → User, nullable for pre-assignment)

\- address\_line1, address\_line2

\- city, state, zip\_code

\- county

\- latitude, longitude (for geo features)

\- year\_built (int, nullable)

\- square\_footage (int, nullable)

\- property\_type (PropertyType enum)

\- bedrooms, bathrooms (int, nullable)

\- has\_pool (boolean, default false) — Florida-first

\- created\_at, updated\_at



\#### Inspection

\- id (UUID, PK)

\- property\_id (FK → Property)

\- inspector\_id (FK → User where role=INSPECTOR)

\- status (InspectionStatus enum)

\- scheduled\_date (datetime)

\- started\_at (datetime, nullable)

\- completed\_at (datetime, nullable)

\- approved\_at (datetime, nullable)

\- approved\_by (FK → User where role=ADMIN, nullable)

\- notes (text, nullable)

\- created\_at, updated\_at

\- \*\*Constraint\*\*: One active inspection per property (status != APPROVED/REJECTED)



\#### Section

\- id (UUID, PK)

\- inspection\_id (FK → Inspection)

\- template\_id (FK → SectionTemplate)

\- order\_index (int)

\- is\_complete (boolean, default false)

\- is\_not\_applicable (boolean, default false)

\- notes (text, nullable)

\- created\_at, updated\_at



\#### SectionTemplate (Seed data, not user-created)

\- id (UUID, PK)

\- name (string) — e.g., "Roof", "Electrical"

\- description (text)

\- icon (string)

\- order\_index (int)

\- default\_components (JSON) — preset chips for this section

\- is\_active (boolean, default true)



\*\*MVP Section Templates:\*\*

1\. Roof

2\. Exterior (Siding, Trim, Fascia)

3\. Foundation / Structure

4\. Plumbing

5\. Electrical

6\. HVAC

7\. Interior (by room or general)

8\. Insulation / Ventilation

9\. Appliances

10\. Garage

11\. Pool / Spa

12\. Grounds / Drainage



\#### Observation

\- id (UUID, PK)

\- section\_id (FK → Section)

\- component (string) — e.g., "Shingles", "Outlets", "Water Heater"

\- description\_raw (text) — inspector's actual input (voice-to-text or typed)

\- status (ObservationStatus enum)

\- severity (ObservationSeverity enum)

\- urgency (Urgency enum)

\- location\_detail (string, nullable) — "North slope", "Master bathroom"

\- inspector\_notes (text, nullable)

\- order\_index (int)

\- created\_at, updated\_at

\- \*\*Constraint\*\*: Must have at least 1 associated Media record



\#### Media

\- id (UUID, PK)

\- observation\_id (FK → Observation, nullable)

\- section\_id (FK → Section, nullable)

\- property\_id (FK → Property, nullable)

\- storage\_url (string)

\- thumbnail\_url (string, nullable)

\- mime\_type (string)

\- file\_size\_bytes (int)

\- hash\_sha256 (string) — integrity verification

\- capture\_timestamp (datetime)

\- latitude, longitude (nullable)

\- device\_id (string, nullable)

\- inspector\_id (FK → User)

\- created\_at

\- \*\*At least one of\*\*: observation\_id, section\_id, or property\_id must be set



\#### Issue (System-generated, not manually created)

\- id (UUID, PK)

\- observation\_id (FK → Observation)

\- inspection\_id (FK → Inspection) — denormalized for query performance

\- property\_id (FK → Property) — denormalized for query performance

\- normalized\_title (string) — "Asphalt Shingle Repair"

\- normalized\_description (text) — plain-language explanation

\- master\_format\_code (string, nullable) — CSI code e.g., "07-31-13"

\- trade\_category (string) — "Roofing", "Plumbing", "Electrical", etc.

\- severity\_score (int, 1-4) — 4=Critical, 1=Low

\- severity\_label (IssueSeverity enum)

\- risk\_category (string, nullable) — "Water Intrusion", "Fire Hazard", "Structural"

\- urgency (Urgency enum)

\- is\_safety\_hazard (boolean)

\- insurance\_relevant (boolean, default false) — hook for Phase 2

\- homeowner\_description (text) — simplified version for homeowner view

\- created\_at, updated\_at



\#### DefectDictionary (Seed data — the Rules Engine lookup table)

\- id (UUID, PK)

\- section\_template\_id (FK → SectionTemplate)

\- component\_match (string) — what to match in observation.component

\- condition\_match (ObservationStatus)

\- severity\_match (ObservationSeverity, nullable) — optional additional filter

\- normalized\_title (string) — output title

\- normalized\_description (text)

\- homeowner\_description (text)

\- master\_format\_code (string)

\- trade\_category (string)

\- default\_severity\_score (int)

\- risk\_category (string, nullable)

\- is\_safety\_hazard (boolean)

\- insurance\_relevant (boolean)

\- is\_active (boolean, default true)

\- created\_at, updated\_at



\#### Project

\- id (UUID, PK)

\- property\_id (FK → Property)

\- owner\_id (FK → User where role=HOMEOWNER)

\- title (string)

\- intent\_summary (text) — what the homeowner initially wants

\- intent\_tags (string\[]) — \["roof\_repair", "pre\_purchase", "full\_renovation", "insurance"]

\- status (ProjectStatus enum)

\- scope\_locked\_at (datetime, nullable)

\- created\_at, updated\_at



\#### ScopeItem

\- id (UUID, PK)

\- project\_id (FK → Project)

\- issue\_id (FK → Issue, nullable) — nullable for homeowner-added items

\- scope\_snapshot\_id (FK → ScopeSnapshot, nullable) — set when scope is locked

\- title (string)

\- description (text)

\- trade\_category (string)

\- master\_format\_code (string, nullable)

\- is\_homeowner\_added (boolean, default false)

\- is\_suppressed (boolean, default false) — homeowner chose not to fix now

\- order\_index (int)

\- created\_at, updated\_at



\#### ScopeSnapshot (Immutable scope version for bidding)

\- id (UUID, PK)

\- project\_id (FK → Project)

\- version (int) — auto-increment per project

\- locked\_at (datetime)

\- scope\_data (JSON) — frozen copy of all scope items at lock time

\- is\_active (boolean, default true) — only one active per project

\- created\_at



\#### ContractorProfile

\- id (UUID, PK)

\- user\_id (FK → User where role=CONTRACTOR, unique)

\- company\_name (string)

\- license\_number (string, nullable)

\- license\_image\_url (string, nullable)

\- insurance\_cert\_url (string, nullable)

\- trade\_categories (string\[]) — \["Roofing", "Siding"]

\- master\_format\_codes (string\[]) — CSI codes they service

\- service\_radius\_miles (int, default 50)

\- status (ContractorStatus enum)

\- bio (text, nullable)

\- years\_experience (int, nullable)

\- verified\_at (datetime, nullable)

\- verified\_by (FK → User where role=ADMIN, nullable)

\- created\_at, updated\_at



\#### Proposal

\- id (UUID, PK)

\- project\_id (FK → Project)

\- scope\_snapshot\_id (FK → ScopeSnapshot)

\- contractor\_id (FK → User where role=CONTRACTOR)

\- total\_amount (decimal)

\- status (ProposalStatus enum)

\- notes (text, nullable)

\- estimated\_start\_date (date, nullable)

\- estimated\_duration\_days (int, nullable)

\- expires\_at (datetime)

\- submitted\_at (datetime, nullable)

\- created\_at, updated\_at



\#### ProposalItem

\- id (UUID, PK)

\- proposal\_id (FK → Proposal)

\- scope\_item\_id (FK → ScopeItem)

\- line\_item\_cost (decimal)

\- notes (text, nullable)

\- created\_at, updated\_at



---



\## 4. THE RULES ENGINE (How Observations Become Issues)



\### Architecture: Template-Based Mapping with Progressive AI Enhancement



The Rules Engine is NOT a separate service. It is a TypeScript module (`/lib/rules-engine/`) that runs as a server action or API route handler.



\### Flow:

```

1\. Inspector creates/updates Observation

2\. System looks up DefectDictionary where:

&nbsp;  - section\_template matches observation's section

&nbsp;  - component\_match is fuzzy-matched against observation.component

&nbsp;  - condition\_match matches observation.status

&nbsp;  - (optional) severity\_match matches observation.severity

3\. If match found → Create/update Issue with dictionary values

4\. If no match → Flag for manual review (Admin dashboard)

5\. Inspector sees proposed Issue, can confirm or adjust title/severity

```



\### Matching Strategy (MVP):

\- \*\*Exact match first\*\*: component\_match === observation.component

\- \*\*Fuzzy match second\*\*: Levenshtein distance < 3 OR substring match

\- \*\*Fallback\*\*: No issue auto-generated; flagged for admin/inspector manual mapping

\- \*\*Learning loop\*\*: Every manual mapping becomes a new DefectDictionary entry (Phase 2)



\### Initial Seed Data:

The DefectDictionary ships with 100+ entries covering the most common defects per section, based on InterNACHI's most-reported defects list. Examples:



| Section | Component | Condition | → Issue Title | MasterFormat | Trade |

|---------|-----------|-----------|---------------|-------------|-------|

| Roof | Shingles | DEFICIENT | Asphalt Shingle Repair/Replacement | 07-31-13 | Roofing |

| Roof | Flashing | DEFICIENT | Roof Flashing Repair | 07-62-00 | Roofing |

| Electrical | Outlets | DEFICIENT | Electrical Outlet Repair | 26-27-26 | Electrical |

| Electrical | Panel | SAFETY\_HAZARD | Electrical Panel Replacement | 26-24-16 | Electrical |

| Plumbing | Water Heater | MAINTENANCE\_NEEDED | Water Heater Replacement | 22-34-00 | Plumbing |

| HVAC | AC Unit | DEFICIENT | AC System Repair | 23-81-00 | HVAC |

| Foundation | Foundation Wall | MAJOR\_DEFECT | Foundation Crack Repair | 03-01-00 | Structural |

| Exterior | Siding | DEFICIENT | Siding Repair/Replacement | 07-46-00 | Siding |

| Pool | Pool Equipment | DEFICIENT | Pool Equipment Repair | 13-11-00 | Pool |

| Interior | Drywall | COSMETIC | Drywall Repair | 09-29-00 | General |



---



\## 5. USER JOURNEYS (Precise MVP Flows)



\### 5.1 Homeowner Journey

```

1\. Signs up (email/magic link)

2\. Enters property address → Property created

3\. "What do you need help with?" → selects intent tags

4\. Project auto-created with intent

5\. Prompted: "Schedule your inspection" → picks date

6\. Admin assigns inspector

7\. Inspection happens (homeowner doesn't interact during)

8\. Inspection approved by admin

9\. Home Profile unlocks → sees Issues dashboard (visual, simplified, by urgency)

10\. Reviews Issues → toggles "Fix This" / "Not Now" per issue

11\. Scope items created from selected issues

12\. Locks scope → ScopeSnapshot created

13\. Project enters BIDDING status

14\. Admin invites matching contractors (MVP: manual)

15\. Reviews proposals (line-item comparison)

16\. Selects contractor → Project becomes ACTIVE

```



\### 5.2 Inspector Journey

```

1\. Logs in (email/password)

2\. Dashboard shows assigned inspections with schedule

3\. Taps inspection → sees property details + scheduled date

4\. "Start Inspection" → status = IN\_PROGRESS

5\. Section rail appears (left sidebar on tablet, bottom on phone)

6\. Taps section → sees component presets (chips)

7\. Taps component chip OR creates custom

8\. Camera opens → captures photo(s) (MANDATORY)

9\. Sets status + severity via quick-select buttons

10\. Optionally adds voice note or typed description

11\. Observation saved locally (IndexedDB)

12\. Background sync uploads media + observation data

13\. Rail updates completion indicator for section

14\. Repeats for all sections

15\. "Complete Inspection" → status = IN\_REVIEW

16\. Admin reviews and approves/rejects

```



\### 5.3 Contractor Journey

```

1\. Signs up (email/password)

2\. Completes profile: company, license, insurance, trade categories

3\. Account status = PENDING (awaits admin verification)

4\. Once ACTIVE: sees available projects matching their trades

5\. Taps project → sees ONLY scope items matching their trade codes

6\. For each scope item: sees photos, description, severity, location

7\. Enters line-item pricing per scope item

8\. Adds optional notes, estimated timeline

9\. Submits proposal

10\. Awaits homeowner selection

```



\### 5.4 Admin Journey

```

1\. Logs in

2\. Dashboard: pending inspections, pending contractor verifications, inspection reviews

3\. Assigns inspectors to scheduled inspections

4\. Monitors inspection progress (list view with status, not real-time)

5\. Reviews completed inspections → approves or rejects with notes

6\. Reviews contractor applications → verifies license/insurance → approves

7\. Matches contractors to bidding projects (manual for MVP)

```



---



\## 6. PRESENTATION LAYER (View-Model Pattern)



\### 6.1 Homeowner View

\- \*\*Dashboard\*\*: Issues grouped by urgency (Safety → Major → Minor → Cosmetic)

\- \*\*Language\*\*: Plain English. "Reverse Polarity" → "Electrical wiring installed backwards"

\- \*\*Visual\*\*: Photo-centric cards. Red/yellow/green severity indicators.

\- \*\*Actions\*\*: "Fix This" button per issue. "Not Now" to suppress.

\- \*\*No access to\*\*: raw observation data, inspector notes, technical codes



\### 6.2 Contractor View

\- \*\*Scope isolation\*\*: Sees ONLY issues matching their trade\_category/master\_format\_codes

\- \*\*Technical detail\*\*: Full observation descriptions, inspector notes, MasterFormat codes

\- \*\*Media\*\*: High-res photos with location annotations

\- \*\*Bid interface\*\*: Line-item pricing form mapped to each scope item

\- \*\*No access to\*\*: other contractor bids, homeowner financial data, unrelated issues



\### 6.3 Inspector View

\- \*\*Capture-optimized\*\*: Section rail, observation cards, media-first flow

\- \*\*Speed\*\*: Presets, defaults, quick-select buttons, voice input

\- \*\*No access to\*\*: project data, contractor data, pricing



\### 6.4 Admin View

\- \*\*God mode\*\*: Sees everything across all entities

\- \*\*Queues\*\*: Inspection assignments, inspection reviews, contractor verifications

\- \*\*Metrics\*\*: Inspections completed, average completion time, issues per inspection



---



\## 7. MEDIA SYSTEM



\### MVP Constraints

\- Photos required per observation (minimum 1)

\- Max file size: 10MB per photo (compress on device if larger)

\- Formats: JPEG, HEIC (convert to WebP server-side for storage efficiency)

\- Thumbnails auto-generated (300px wide) on upload

\- Metadata captured on device: timestamp, GPS coordinates, device ID

\- SHA-256 hash computed on upload for integrity verification



\### Storage Structure (Supabase Storage Buckets)

```

inspection-media/

&nbsp; ├── {property\_id}/

&nbsp; │   ├── {inspection\_id}/

&nbsp; │   │   ├── {observation\_id}/

&nbsp; │   │   │   ├── original/{media\_id}.webp

&nbsp; │   │   │   └── thumb/{media\_id}.webp

&nbsp; │   │   └── section/{section\_id}/{media\_id}.webp

&nbsp; │   └── property/{media\_id}.webp

```



\### Access Control (RLS)

\- Inspectors: Read/write their own inspection media

\- Homeowners: Read their property media

\- Contractors: Read media for scope items they're bidding on

\- Admin: Read all media



---



\## 8. OFFLINE-FIRST STRATEGY (Inspector PWA)



\### Architecture

```

Device (IndexedDB via Dexie.js)

&nbsp; ↕ Service Worker (Background Sync API)

&nbsp;   ↕ Supabase (Postgres + Storage)

```



\### Sync Rules

1\. Inspector opens inspection → full section templates + existing data downloaded to IndexedDB

2\. All writes go to IndexedDB FIRST (optimistic UI)

3\. Service Worker detects connectivity → syncs pending changes

4\. Media: captured to local blob storage → queued for upload → uploaded via resumable upload

5\. Conflict resolution: Last-write-wins with server timestamp (inspector is sole writer per inspection)

6\. Sync status indicator always visible in UI (green/yellow/red)



---



\## 9. FOLDER STRUCTURE



```

/

├── CLAUDE.md                          # Agent constitution

├── ARCHITECTURE.md                    # This document

├── prisma/

│   ├── schema.prisma                  # Data model source of truth

│   ├── seed.ts                        # Section templates + defect dictionary

│   └── migrations/

├── src/

│   ├── app/                           # Next.js App Router

│   │   ├── (auth)/                    # Auth pages (login, signup, verify)

│   │   │   ├── login/page.tsx

│   │   │   ├── signup/page.tsx

│   │   │   └── layout.tsx

│   │   ├── (dashboard)/               # Authenticated layouts

│   │   │   ├── homeowner/             # Homeowner pages

│   │   │   │   ├── dashboard/page.tsx

│   │   │   │   ├── property/\[id]/page.tsx

│   │   │   │   ├── project/\[id]/page.tsx

│   │   │   │   └── layout.tsx

│   │   │   ├── inspector/             # Inspector pages

│   │   │   │   ├── dashboard/page.tsx

│   │   │   │   ├── inspection/\[id]/page.tsx  # The capture engine

│   │   │   │   └── layout.tsx

│   │   │   ├── contractor/            # Contractor pages

│   │   │   │   ├── dashboard/page.tsx

│   │   │   │   ├── project/\[id]/page.tsx

│   │   │   │   ├── proposal/\[id]/page.tsx

│   │   │   │   └── layout.tsx

│   │   │   ├── admin/                 # Admin pages

│   │   │   │   ├── dashboard/page.tsx

│   │   │   │   ├── inspections/page.tsx

│   │   │   │   ├── contractors/page.tsx

│   │   │   │   ├── users/page.tsx

│   │   │   │   └── layout.tsx

│   │   │   └── layout.tsx             # Shared authenticated layout

│   │   ├── api/                       # API routes

│   │   │   ├── inspections/

│   │   │   ├── observations/

│   │   │   ├── issues/

│   │   │   ├── projects/

│   │   │   ├── proposals/

│   │   │   ├── media/

│   │   │   └── admin/

│   │   ├── layout.tsx                 # Root layout

│   │   └── page.tsx                   # Landing page

│   ├── components/

│   │   ├── ui/                        # shadcn/ui components

│   │   ├── inspection/                # Inspection-specific components

│   │   │   ├── section-rail.tsx

│   │   │   ├── observation-card.tsx

│   │   │   ├── media-capture.tsx

│   │   │   └── severity-picker.tsx

│   │   ├── homeowner/                 # Homeowner-specific components

│   │   ├── contractor/                # Contractor-specific components

│   │   ├── admin/                     # Admin-specific components

│   │   └── shared/                    # Shared components

│   ├── lib/

│   │   ├── db.ts                      # Prisma client singleton

│   │   ├── auth.ts                    # Supabase auth helpers

│   │   ├── storage.ts                 # Supabase storage helpers

│   │   ├── rules-engine/              # THE MOAT

│   │   │   ├── index.ts               # Main engine entry

│   │   │   ├── matcher.ts             # Observation → DefectDictionary matching

│   │   │   ├── issue-generator.ts     # Creates Issue from matched rule

│   │   │   └── types.ts

│   │   ├── offline/                   # Offline sync logic

│   │   │   ├── db.ts                  # Dexie.js schema

│   │   │   ├── sync.ts               # Sync manager

│   │   │   └── queue.ts              # Upload queue

│   │   └── utils/

│   │       ├── media.ts               # Image compression, hash generation

│   │       ├── format.ts              # MasterFormat helpers

│   │       └── permissions.ts         # Role-based access helpers

│   ├── hooks/                         # React hooks

│   ├── types/                         # Shared TypeScript types

│   └── middleware.ts                  # Auth + role-based routing middleware

├── public/

│   ├── manifest.json                  # PWA manifest

│   └── sw.js                          # Service worker

├── package.json

├── tailwind.config.ts

├── tsconfig.json

└── next.config.ts

```



---



\## 10. NOT MVP (Explicit Exclusions)



These are PROHIBITED from being built. Hooks (database columns, nullable fields) are allowed. Execution is not.



| Feature | Why Excluded | Hook Allowed |

|---------|-------------|--------------|

| Automated pricing | Requires market data | `estimated\_cost\_range` field on Issue |

| AI damage detection | Requires training data | `ai\_confidence\_score` field on Issue |

| Payments \& escrow | Regulatory complexity | `payment\_milestone` table (empty) |

| Permit filing | API integrations | `permit\_required` boolean on Issue |

| Insurance filing | Partner integrations | `insurance\_relevant` boolean on Issue |

| In-app financing | Banking partner needed | None |

| Chat/messaging | Complexity vs. value | `notification\_preferences` on User |

| Contractor auto-matching | Need trust data first | `service\_radius\_miles` on ContractorProfile |

| Multiple inspections per property | Adds complexity | Schema supports it via FK |



---



\## 11. BUILD PHASES (Agent Work Packages)



\### Phase 0: Foundation (Days 1-2)

\- \[ ] Next.js project scaffold with TypeScript strict mode

\- \[ ] Prisma schema (complete, from this doc)

\- \[ ] Supabase project setup (Auth, Storage, Database)

\- \[ ] Seed data: SectionTemplates + DefectDictionary (100+ entries)

\- \[ ] shadcn/ui installation + base component setup

\- \[ ] Auth flows: login, signup, magic link, role-based redirect

\- \[ ] Middleware: role-based route protection

\- \[ ] CLAUDE.md finalized in repo root



\### Phase 1: Inspector Engine (Days 3-6) — THE CRITICAL PATH

\- \[ ] Section rail navigation component

\- \[ ] Observation card creation/editing

\- \[ ] Media capture (camera API + file upload)

\- \[ ] Severity/status quick-select UI

\- \[ ] Preset chips per section (from SectionTemplate.default\_components)

\- \[ ] Inspection start/complete flow

\- \[ ] Offline: Dexie.js schema + sync manager (can defer to Phase 1b)

\- \[ ] Rules engine: matcher + issue generator



\### Phase 2: Homeowner Experience (Days 5-8)

\- \[ ] Signup + property creation flow

\- \[ ] Intent selection ("What do you need help with?")

\- \[ ] Project auto-creation

\- \[ ] Home Profile dashboard (issues by urgency)

\- \[ ] Issue cards (homeowner-friendly language, photos)

\- \[ ] "Fix This" / "Not Now" toggle per issue

\- \[ ] Scope review page

\- \[ ] Scope lock action (creates ScopeSnapshot)



\### Phase 3: Admin Dashboard (Days 5-8, parallel with Phase 2)

\- \[ ] Admin dashboard overview

\- \[ ] Inspection assignment (inspector ↔ inspection)

\- \[ ] Inspection review queue (approve/reject)

\- \[ ] Contractor verification queue

\- \[ ] User management (CRUD)

\- \[ ] Contractor → Project assignment (manual matching)



\### Phase 4: Contractor Experience (Days 7-10)

\- \[ ] Contractor signup + profile creation

\- \[ ] Trade category / MasterFormat code selection

\- \[ ] Available projects list (filtered by trade match)

\- \[ ] Project detail view (scope items + media, filtered by trade)

\- \[ ] Proposal creation (line-item pricing)

\- \[ ] Proposal submission



\### Phase 5: Integration \& Polish (Days 9-12)

\- \[ ] Homeowner proposal comparison view

\- \[ ] Contractor selection flow

\- \[ ] Email notifications (inspection complete, proposal received, selected)

\- \[ ] PWA manifest + service worker

\- \[ ] Responsive design pass (tablet for inspector, mobile for homeowner)

\- \[ ] Error handling + loading states

\- \[ ] End-to-end flow testing



---



\## 12. GEOGRAPHIC CONTEXT



This platform is \*\*Florida-first\*\*. This means:

\- Pool/Spa is a mandatory section (high prevalence)

\- Wind mitigation observations are included (hurricane region)

\- 4-Point inspection template is a future Phase 2 deliverable

\- Hurricane shutters / impact windows are common scope items in DefectDictionary

\- Insurance relevance flags are critical (Citizens, Universal, etc.)

\- Humidity/mold observations have elevated severity defaults



---



\## 13. INDUSTRY STANDARDS ALIGNMENT



| Standard | Where Applied | MVP vs Future |

|----------|--------------|---------------|

| \*\*CSI MasterFormat\*\* | Issue.master\_format\_code, ContractorProfile.master\_format\_codes | MVP — core to trade matching |

| \*\*InterNACHI/ASHI SOP\*\* | SectionTemplate definitions, observation presets, severity mapping | MVP — seeds the DefectDictionary |

| \*\*RESO Data Dictionary 2.0\*\* | Property entity field naming | MVP (naming convention) |

| \*\*MISMO Inspection Standards\*\* | Inspection entity structure | Future — insurance integration |

| \*\*C2PA\*\* | Media provenance metadata | Future — trust/audit enhancement |



