\# CLAUDE.md — Project Constitution



\## WHAT THIS IS

A Property Intelligence \& Execution Platform that turns home inspections into structured data, then converts that data into scoped projects, contractor bids, and managed execution.



\*\*The inspection is NOT a feature. The inspection is the root of the data tree.\*\*



\## IDENTITY

\- System of Record for the physical condition of a home

\- Trust layer between homeowners, inspectors, and contractors

\- Execution engine for home improvement work



\## THIS IS NOT

\- A lead marketplace (not Thumbtack / Angi)

\- A report generator (not Spectora)

\- A CRM with forms



---



\## ARCHITECTURAL LAW: SEPARATION OF CONCERNS



Four layers. Never collapse them. No direct dependency between Capture and Execution.



1\. \*\*Data Capture\*\* (Inspector UX) — optimized for speed and fidelity

2\. \*\*Normalization \& Intelligence\*\* (Rules Engine) — observations → standardized issues

3\. \*\*Data Presentation\*\* (Role-based views) — homeowner sees trust, contractor sees specs

4\. \*\*Execution Workflows\*\* (Projects, proposals) — manages the transaction lifecycle



---



\## TECH STACK



| Layer | Technology |

|-------|-----------|

| Framework | Next.js 15 (App Router) |

| Language | TypeScript (strict mode) |

| Database | PostgreSQL via Supabase |

| ORM | Prisma |

| Auth | Supabase Auth |

| Storage | Supabase Storage |

| UI | TailwindCSS + shadcn/ui |

| Offline | Service Worker + IndexedDB (Dexie.js) |

| Deployment | Vercel |



\## CODING STANDARDS



\### TypeScript

\- Strict mode enabled. No `any` types.

\- Use Prisma-generated types for all database entities.

\- Prefer `type` over `interface` for consistency.

\- Use Zod for all API input validation.

\- Server actions for mutations. API routes for complex queries.



\### React / Next.js

\- App Router only. No Pages Router.

\- Server Components by default. `'use client'` only when needed (interactivity, hooks).

\- Use `loading.tsx` and `error.tsx` for every route segment.

\- Colocate components with their routes when route-specific.

\- Shared components go in `/src/components/`.



\### Database

\- Prisma schema is the source of truth. Never write raw SQL in application code.

\- All queries go through Prisma client (`/src/lib/db.ts`).

\- Use Prisma transactions for multi-table writes.

\- Always include `created\_at` and `updated\_at` on every table.



\### Styling

\- TailwindCSS utility classes only. No custom CSS files.

\- shadcn/ui for all base components (Button, Card, Dialog, etc.).

\- Mobile-first responsive design.

\- Consistent color system via Tailwind config.



\### File Naming

\- Components: `PascalCase.tsx` (e.g., `SectionRail.tsx`)

\- Utils/hooks: `camelCase.ts` (e.g., `useInspection.ts`)

\- Routes: lowercase with hyphens (Next.js convention)

\- Types: `PascalCase` (e.g., `type ObservationWithMedia = ...`)



---



\## KEY ENTITIES (Quick Reference)



```

User (roles: HOMEOWNER | INSPECTOR | CONTRACTOR | ADMIN)

&nbsp; └── Property (address-based, long-lived)

&nbsp;      ├── Inspection (one active per property)

&nbsp;      │    ├── Section (from SectionTemplate: Roof, HVAC, etc.)

&nbsp;      │    │    └── Observation (atomic unit — status + severity + media)

&nbsp;      │    │         └── Media (photos required, SHA-256 hashed)

&nbsp;      │    └── Issue (system-generated via Rules Engine)

&nbsp;      └── Project (homeowner intent → scoped work)

&nbsp;           ├── ScopeItem (issue + homeowner intent → unit of work)

&nbsp;           │    └── ScopeSnapshot (immutable version for bidding)

&nbsp;           └── Proposal (contractor bid)

&nbsp;                └── ProposalItem (line-item cost per scope item)

```



\## RULES ENGINE



Location: `/src/lib/rules-engine/`



The Rules Engine converts Observations into Issues using the DefectDictionary lookup table.



\*\*Flow:\*\*

1\. Observation created/updated

2\. Match against DefectDictionary (section + component + condition)

3\. Exact match → fuzzy match → no match (flag for review)

4\. Generate Issue with normalized title, MasterFormat code, trade category, severity

5\. Inspector confirms or adjusts



\*\*NEVER hardcode rules in application logic.\*\* All rules live in the DefectDictionary table.



\## ROLE-BASED ACCESS



| Entity | Homeowner | Inspector | Contractor | Admin |

|--------|-----------|-----------|------------|-------|

| Property | Own only | Assigned only | None | All |

| Inspection | Own property | Assigned | None | All |

| Observation | None (sees Issues) | Own inspection | None | All |

| Issue | Own property | Own inspection | Matched trade only | All |

| Project | Own only | None | Invited only | All |

| ScopeItem | Own project | None | Matched trade only | All |

| Proposal | Own project (read) | None | Own only | All |



\## WHAT IS PROHIBITED (MVP)



Do NOT build these. No exceptions. No "quick implementations."



\- ❌ Automated pricing / cost estimation

\- ❌ AI damage detection from photos

\- ❌ Payment processing / escrow

\- ❌ Permit filing

\- ❌ Insurance report filing

\- ❌ In-app financing

\- ❌ Real-time chat / messaging

\- ❌ Contractor auto-matching algorithm

\- ❌ Multiple active inspections per property



\*\*Hooks are allowed\*\* (nullable database columns for future use). \*\*Execution is not.\*\*



\## GEOGRAPHIC CONTEXT



Florida-first. Pool/Spa is mandatory section. Wind mitigation included. Insurance relevance flags are critical.



\## INDUSTRY STANDARDS



\- \*\*CSI MasterFormat\*\*: Trade mapping on Issues and ContractorProfile

\- \*\*InterNACHI/ASHI\*\*: Observation presets, severity definitions, DefectDictionary seeds

\- \*\*RESO Data Dictionary 2.0\*\*: Property field naming conventions



\## ERROR HANDLING



\- Every API route: try/catch with structured error responses

\- Every form: Zod validation with user-friendly error messages

\- Every async operation: loading state + error state + empty state

\- Offline operations: queue with retry logic, never silently fail



\## TESTING PRIORITIES



1\. Rules Engine (unit tests for all DefectDictionary mappings)

2\. API routes (role-based access enforcement)

3\. Scope locking logic (snapshot integrity)

4\. Offline sync (conflict resolution)



\## COMMIT CONVENTIONS



```

feat: add section rail navigation

fix: correct observation media validation

chore: update prisma schema

seed: add roofing defect dictionary entries

test: rules engine matcher tests

```



