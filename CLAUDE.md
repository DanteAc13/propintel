# CLAUDE.md — PropIntel Project Constitution

## WHAT THIS IS

A Property Intelligence & Execution Platform that turns home inspections into structured data, then converts that data into scoped projects, contractor bids, and managed execution.

**The inspection is NOT a feature. The inspection is the root of the data tree.**

## IDENTITY

- System of Record for the physical condition of a home
- Trust layer between homeowners, inspectors, and contractors
- Execution engine for home improvement work

## THIS IS NOT

- A lead marketplace (not Thumbtack / Angi)
- A report generator (not Spectora)
- A CRM with forms

---

## DEPLOYMENT

| Key | Value |
|-----|-------|
| Port | 3100 |
| Bind | 172.17.0.1 (Docker bridge only — use Caddy/Tailscale Funnel for browser access) |
| Service | `systemctl --user status propintel` |
| Health | `curl http://172.17.0.1:3100/login` (200 OK) |
| Build | `npm run build` (Next.js production) |
| Start | `systemctl --user start propintel` |
| Logs | `journalctl --user -u propintel -f` |
| Directory | ~/propintel/ |

### Commands
```bash
# Build and restart
cd ~/propintel && npm run build && systemctl --user restart propintel

# Prisma operations
cd ~/propintel && npx prisma generate
cd ~/propintel && npx prisma db push
cd ~/propintel && npx prisma db seed        # SectionTemplates + DefectDictionary
cd ~/propintel && npm run seed:dev-flow      # Test users + full demo data

# Check service
systemctl --user status propintel
journalctl --user -u propintel --since "5 min ago"
```

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase (pooler, us-west-2) |
| ORM | Prisma 7 (PrismaPg driver adapter) |
| Auth | Supabase Auth (@supabase/ssr) |
| Storage | Supabase Storage (inspection-media bucket) |
| AI | Claude API (photo analysis) |
| UI | TailwindCSS + shadcn/ui |
| Deployment | VPS systemd (172.17.0.1:3100) |

### Database Connection
- VPS has no IPv6 — direct Supabase host unreachable
- Must use Supabase pooler: `aws-0-us-west-2.pooler.supabase.com`
- `DATABASE_URL` (port 6543, transaction mode) for app queries
- `DIRECT_URL` (port 5432, session mode) for Prisma migrations
- Credentials in `.env` (chmod 600)

### Prisma 7
- Uses `prisma.config.ts` with `PrismaPg` driver adapter
- `prisma.config.ts` loads `dotenv/config` which reads `.env` (NOT `.env.local`)
- Both `.env` and `.env.local` must have the same Supabase vars

---

## ARCHITECTURAL LAW: SEPARATION OF CONCERNS

Four layers. Never collapse them. No direct dependency between Capture and Execution.

1. **Data Capture** (Inspector UX) — optimized for speed and fidelity
2. **Normalization & Intelligence** (Rules Engine) — observations → standardized issues
3. **Data Presentation** (Role-based views) — homeowner sees trust, contractor sees specs
4. **Execution Workflows** (Projects, proposals) — manages the transaction lifecycle

---

## AUTHENTICATION & AUTHORIZATION

### Auth Stack
- **Supabase Auth** via `@supabase/ssr` (cookie-based sessions)
- **Middleware** (`src/middleware.ts`): refreshes session, protects routes
- **Server auth** (`src/lib/auth.ts`): `getCurrentUser()` checks `is_active` flag
- **API auth** (`src/lib/api-auth.ts`): shared `authenticateRequest(allowedRoles?)` utility

### Auth Flow
1. Middleware intercepts all requests, refreshes Supabase session cookie
2. Protected pages → redirect to `/login` if no session
3. Protected APIs → return 401 JSON if no session
4. `authenticateRequest()` in each API route verifies role + returns typed user

### Security Rules
- Self-signup restricted to HOMEOWNER role only
- Inspector/Contractor/Admin accounts require admin creation
- `is_active: true` checked on every auth call (deactivated users blocked)
- Open redirect prevention on auth callback and login redirectTo
- Rate limiting: auth (10/15min per IP), upload (30/5min per IP), AI (20/min per IP)
- Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, referrer-policy, permissions-policy
- Media uses signed URLs (1hr expiry), not public URLs
- TOCTOU race prevention on select-contractor (transaction re-check + 409)
- Media cross-reference constrained by inspector_id + property_id
- All API routes use server-side `user.id` (never trust client-supplied identity)
- AI endpoints require INSPECTOR or ADMIN role
- Media upload validates file type + 10MB limit + inspection ownership

### RBAC Matrix (Enforced in all 33 API routes)

| Entity | Homeowner | Inspector | Contractor | Admin |
|--------|-----------|-----------|------------|-------|
| Property | Own only | Assigned only | None | All |
| Inspection | Own property | Assigned | None | All |
| Observation | None (sees Issues) | Own inspection | None | All |
| Issue | Own property | Own inspection | Matched trade only | All |
| Project | Own only | None | Invited only | All |
| ScopeItem | Own project | None | Matched trade only | All |
| Proposal | Own project (read) | None | Own only | All |

---

## KEY FILES

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | Supabase auth helpers (createClient, getCurrentUser, requireRole) |
| `src/lib/api-auth.ts` | Shared `authenticateRequest()` for all API routes |
| `src/middleware.ts` | Route protection + session refresh + rate limiting |
| `src/lib/rate-limit.ts` | In-memory sliding window rate limiter |
| `src/lib/supabase-admin.ts` | Server-only Supabase admin client (user creation, storage) |
| `src/lib/pagination.ts` | Shared parsePagination + paginationMeta utilities |
| `src/app/(auth)/login/LoginForm.tsx` | Login form client component (reads redirectTo) |
| `src/app/(auth)/actions.ts` | Login/signup/logout server actions |
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/lib/rules-engine/` | DefectDictionary → Issue generation |
| `prisma/schema.prisma` | 15 models, 10 enums, source of truth |
| `prisma/seed.ts` | SectionTemplates (12) + DefectDictionary (48) |
| `prisma/seed-dev-flow.ts` | 4 test users + full demo data |
| `src/components/admin/DefectDictionaryManager.tsx` | CRUD UI for defect dictionary |
| `src/components/admin/PricingInsights.tsx` | Pricing intelligence dashboard |
| `src/components/shared/FeedbackWidget.tsx` | Floating feedback button (all dashboards) |
| `src/lib/email-templates.ts` | 5 email templates (invite, inspector assigned, proposal, etc.) |
| `data/pilot-feedback.jsonl` | Pilot feedback storage (JSONL, file-based) |
| `prisma.config.ts` | Prisma 7 PrismaPg driver config |
| `.env` / `.env.local` | Supabase credentials (chmod 600) |
| `propintel.service` | systemd unit file |

---

## API ROUTES (43 total)

### Inspections (`/api/inspections/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/inspections` | GET | ALL (role-scoped) |
| `/api/inspections` | POST | ADMIN |
| `/api/inspections/[id]` | GET, PUT, DELETE | INSPECTOR, ADMIN |
| `/api/inspections/[id]/start` | POST | INSPECTOR, ADMIN |
| `/api/inspections/[id]/complete` | POST | INSPECTOR, ADMIN |
| `/api/inspections/[id]/sections` | GET, POST | INSPECTOR, ADMIN |

### Observations (`/api/observations/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/observations` | GET, POST | INSPECTOR, ADMIN |
| `/api/observations/[id]` | GET, PUT, DELETE | INSPECTOR, ADMIN |

### Media (`/api/media/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/media/upload` | POST | INSPECTOR, ADMIN |

### Properties (`/api/properties/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/properties` | GET, POST | HOMEOWNER, ADMIN |
| `/api/properties/[id]` | GET, PUT, DELETE | Owner/Assigned/ADMIN |
| `/api/properties/[id]/issues` | GET | Owner/Assigned/ADMIN |

### Projects (`/api/projects/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/projects` | GET, POST | HOMEOWNER, ADMIN |
| `/api/projects/[id]` | GET, PUT | Owner/Invited/ADMIN |
| `/api/projects/[id]/proposals` | GET, POST | HOMEOWNER, CONTRACTOR, ADMIN |
| `/api/projects/[id]/lock-scope` | POST | HOMEOWNER, ADMIN |
| `/api/projects/[id]/select-contractor` | POST | HOMEOWNER, ADMIN |

### Scope Items (`/api/scope-items/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/scope-items` | GET, POST | HOMEOWNER, ADMIN |
| `/api/scope-items/[id]` | GET, PUT, DELETE | Owner/ADMIN |

### Sections (`/api/sections/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/sections/[id]` | GET, PUT | INSPECTOR, ADMIN |

### Contractor (`/api/contractor/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/contractor/profile` | GET, PUT | CONTRACTOR |
| `/api/contractor/projects` | GET | CONTRACTOR |
| `/api/contractor/projects/[id]` | GET | CONTRACTOR |
| `/api/contractor/proposals` | GET, POST | CONTRACTOR |
| `/api/contractor/proposals/[id]` | GET, PUT | CONTRACTOR |
| `/api/contractor/proposals/[id]/submit` | POST | CONTRACTOR |
| `/api/contractor/stats` | GET | CONTRACTOR |

### Admin (`/api/admin/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/admin/users` | GET, POST | ADMIN |
| `/api/admin/contractors` | GET | ADMIN |
| `/api/admin/contractors/[id]` | PUT | ADMIN |
| `/api/admin/inspections` | GET | ADMIN |
| `/api/admin/inspections/[id]` | PUT | ADMIN |
| `/api/admin/stats` | GET | ADMIN |
| `/api/admin/unmatched-observations` | GET | ADMIN |
| `/api/admin/issues` | POST | ADMIN |
| `/api/admin/defect-dictionary` | GET, POST | ADMIN |
| `/api/admin/defect-dictionary/[id]` | PUT | ADMIN |
| `/api/admin/pricing-insights` | GET | ADMIN |
| `/api/admin/invite-homeowner` | POST | ADMIN |

### Feedback (`/api/feedback/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/feedback` | POST | ANY authenticated |

### AI (`/api/ai/`)
| Route | Methods | Roles |
|-------|---------|-------|
| `/api/ai/analyze-photo` | POST | INSPECTOR, ADMIN |

---

## DATA MODEL (15 models, 10 enums)

```
User (roles: HOMEOWNER | INSPECTOR | CONTRACTOR | ADMIN)
  └── Property (address-based, long-lived)
       ├── Inspection (one active per property)
       │    ├── Section (from SectionTemplate: Roof, HVAC, etc.)
       │    │    └── Observation (atomic unit — status + severity + media)
       │    │         └── Media (photos required, SHA-256 hashed)
       │    └── Issue (system-generated via Rules Engine)
       └── Project (homeowner intent → scoped work)
            ├── ScopeItem (issue + homeowner intent → unit of work)
            │    └── ScopeSnapshot (immutable version for bidding)
            └── Proposal (contractor bid)
                 └── ProposalItem (line-item cost per scope item)

ContractorProfile (linked to User, trade categories, service area)
SectionTemplate (12 standard inspection sections)
DefectDictionary (48 entries, lookup table for Rules Engine)
```

---

## RULES ENGINE

Location: `/src/lib/rules-engine/`

Converts Observations into Issues using the DefectDictionary lookup table.

**Flow:**
1. Observation created/updated
2. Match against DefectDictionary (section + component + condition)
3. Exact match → fuzzy match (Levenshtein) → no match (flag for review)
4. Generate Issue with normalized title, MasterFormat code, trade category, severity
5. Inspector confirms or adjusts

**NEVER hardcode rules in application logic.** All rules live in the DefectDictionary table.

---

## TEST USERS (seed-dev-flow)

| Email | Password | Role |
|-------|----------|------|
| admin@propintel.com | password123 | ADMIN |
| inspector@propintel.com | password123 | INSPECTOR |
| homeowner@propintel.com | password123 | HOMEOWNER |
| contractor@propintel.com | password123 | CONTRACTOR |

---

## CODING STANDARDS

### TypeScript
- Strict mode enabled. No `any` types.
- Use Prisma-generated types for all database entities.
- Prefer `type` over `interface` for consistency.
- Server actions for mutations. API routes for complex queries.

### React / Next.js
- App Router only. No Pages Router.
- Server Components by default. `'use client'` only when needed.
- Colocate components with their routes when route-specific.
- Shared components go in `/src/components/`.

### Database
- Prisma schema is the source of truth. Never write raw SQL.
- All queries go through Prisma client (`/src/lib/db.ts`).
- Use Prisma transactions for multi-table writes.
- All UUIDs, snake_case table names.

### File Naming
- Components: `PascalCase.tsx`
- Utils/hooks: `camelCase.ts`
- Routes: lowercase with hyphens (Next.js convention)
- Types: `PascalCase`

---

## WHAT IS PROHIBITED (MVP)

Do NOT build these. No exceptions.

- Automated pricing / cost estimation
- Payment processing / escrow
- Permit filing
- Insurance report filing
- In-app financing
- Real-time chat / messaging
- Contractor auto-matching algorithm
- Multiple active inspections per property

**Hooks are allowed** (nullable database columns for future use). **Execution is not.**

---

## GEOGRAPHIC CONTEXT

Florida-first. Pool/Spa is mandatory section. Wind mitigation included. Insurance relevance flags are critical.

## INDUSTRY STANDARDS

- **CSI MasterFormat**: Trade mapping on Issues and ContractorProfile
- **InterNACHI/ASHI**: Observation presets, severity definitions, DefectDictionary seeds
- **RESO Data Dictionary 2.0**: Property field naming conventions

## PAGE WIRING STATUS

All pages are wired to real components (Phase 1 complete):

| Page | Status | Component |
|------|--------|-----------|
| `/homeowner/property/[id]` | Wired | PropertyIssuesView (auth + ownership) |
| `/homeowner/project/[id]` | Wired | ScopeReview (auth + ownership) |
| `/admin/inspections` | Wired | InspectionQueue (auth + notFound for non-admin) |
| `/admin/contractors` | Wired | ContractorQueue (auth + notFound for non-admin) |
| `/admin/users` | Wired | UserList (auth + notFound for non-admin) |
| `/contractor/project/[id]` | Redirect | → `/contractor/projects/[id]` (UUID validated) |
| `/contractor/proposal/[id]` | Redirect | → `/contractor/proposals/[id]` (UUID validated) |
| `/login` | Wired | LoginForm (honors redirectTo from middleware) |
| `/signup` | Fixed | Role selector removed (HOMEOWNER only) |
| `/admin/defect-dictionary` | Wired | DefectDictionaryManager (CRUD, search, filters) |
| `/admin/pricing` | Wired | PricingInsights (proposal cost benchmarks) |

## KNOWN ISSUES / TODO

- Missing `loading.tsx`/`error.tsx` on ~12 route segments
- `SCOPE_LOCKED` ProjectStatus enum value never used in backend logic
- Observation update doesn't re-run rules engine on component change
- Query param status values not validated against enums
- Levenshtein threshold is absolute (6), should be relative to string length
- Need to create `inspection-media` Supabase Storage bucket (Dan, manual)
- ANTHROPIC_API_KEY not yet configured for AI photo analysis
- `/api/ai/analyze-photo` endpoint referenced in ObservationForm but route doesn't exist yet
- Contractor has two dashboard pages: `/contractor` (ContractorDashboard client component) and `/contractor/dashboard` (server-rendered) — should consolidate

## BIAS CHECK

- **Survivorship bias**: Only seeing successful inspections in test data. Real data will have incomplete/abandoned inspections.
- **Tool bias**: AI photo analysis exists but is NOT the core product. Don't over-invest in AI features before the data capture workflow is solid.
