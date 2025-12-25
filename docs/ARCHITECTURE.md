# Architecture Overview

## System Design

Roni AI Platform is a config-driven, AI-first finance platform. The core insight is that most finance workflows follow the same pattern:

1. **Data Entry** → Table with validations and computed fields
2. **Approval** → Tool execution with confirmation
3. **Posting** → Journal entries to accounting system
4. **Reporting** → Trial Balance, P&L, Balance Sheet

By making this pattern config-driven, we can:
- Generate new client workflows from natural language prompts
- Let AI agents operate the system safely
- Avoid writing custom code for each client

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER / AI AGENT                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                            │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │ PageRenderer│───▶│ BoxRegistry │───▶│ TableBox/FormDrawer │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│         │                                        │                │
│         │ GET /app-config/pages/:slug           │ POST /tools/   │
│         │                                        │ execute        │
└─────────┼────────────────────────────────────────┼───────────────┘
          │                                        │
          ▼                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PLATFORM API (Fastify)                         │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │ App Config  │    │Tool Gateway │    │ Auth/Permissions    │   │
│  │ Service     │    │ (Ajv valid) │    │ (RBAC)              │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│         │                  │                     │                │
└─────────┼──────────────────┼─────────────────────┼───────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                      CORE ENGINES                                 │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │Data Ingest  │    │Agent Runtime│    │ Accounting Engine   │   │
│  │(DDL/Views)  │    │(Tool Exec)  │    │ (Journal/Posting)   │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
│         │                  │                     │                │
└─────────┼──────────────────┼─────────────────────┼───────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                   │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │
│  │ PostgreSQL  │    │  Prisma     │    │ Connectors          │   │
│  │ (per-org)   │    │  (ORM)      │    │ (Plaid/Stripe)      │   │
│  └─────────────┘    └─────────────┘    └─────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### DataModelSpec

The central schema that drives everything. AI generates this from prompts.

```typescript
DataModelSpec {
  name: string                    // e.g., "client1_sales_report"
  description: string
  base_table: TableSpec           // Main data table
  dimension_tables: TableSpec[]   // Lookup tables (payers, clients, etc.)
  view: ViewSpec                  // Denormalized view for UI
  auto_lookups: AutoLookupSpec[]  // Composite key → value mappings
  accounting_config: {
    journal_template: JournalLine[] // How to generate journal entries
  }
}
```

### PageConfig / BoxSpec

Config-driven UI. No frontend code changes for new screens.

```typescript
PageConfig {
  id: string
  slug: string                    // URL path
  title: string
  screen_context: string          // Links to DataModelSpec
  allowed_tool_scopes: string[]   // What tools can be called
  boxes: BoxSpec[]                // UI components
}

BoxSpec {
  id: string
  type: "table" | "form" | "chart" | "stats"
  position: { row, col, width, height }
  spec: TableSpec | FormSpec | ChartSpec  // Type-specific config
}
```

### Tool Gateway

Secure execution layer for AI agents.

```
Request → Ajv Validate → Permission Check → Preview/Confirm → Execute → Audit
```

Key features:
- JSON Schema validation (generated from Zod)
- Confirmation flow for destructive actions
- Idempotency (same request = same result)
- Full audit logging

### Accounting Engine

Auto-generates journal entries from data changes.

```
Data Insert → Journal Template → Journal Entry → Posting → Ledger Update
```

Each DataModelSpec can define an `accounting_config` that specifies:
- Which account codes to use
- Debit vs credit rules
- Amount sources (which column)

---

## Multi-Tenancy

### Current (Day 1)
- Single org via env variable: `NEXT_PUBLIC_ORG_ID`
- No authentication
- All users see all data

### Future (M5)
- JWT authentication with org_id claim
- Separate PostgreSQL schemas per org (or row-level security)
- RBAC permissions per screen/action

---

## Package Responsibilities

| Package | Responsibility |
|---------|---------------|
| shared-contracts | Zod schemas, types, fixtures, validation |
| platform-api | HTTP API, Tool Gateway, App Config |
| frontend | React UI, PageRenderer, BoxRegistry |
| agent-runtime | Tool execution engine |
| data-ingestion | DataModelSpec → PostgreSQL DDL |
| accounting-core | Journal entries, posting, statements |
| worker | Background jobs, async posting |
| packs | Content templates, CoA, mappings |

---

## Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 | SSR, App Router, React 18 |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| API | Fastify | Fast, TypeScript-native |
| Validation | Zod + Ajv | Zod for types, Ajv for runtime |
| ORM | Prisma | Type-safe, migrations |
| Database | PostgreSQL | JSONB, robust, scalable |
| Connectors | Node.js | Plaid SDK, Stripe SDK |

---

## Security Model

### API Security
- All requests require `x-org-id` header (v1)
- Tool Gateway validates against JSON Schema
- Destructive actions require confirmation flow
- Full audit trail of all mutations

### Data Security
- Org isolation (v1: single org, future: schema separation)
- Sensitive data encrypted at rest
- Secrets in environment variables / secret manager

### Frontend Security
- No sensitive data in client-side storage
- API client automatically injects org context
- Error messages don't leak internal details

---

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare                               │
│                     (CDN, WAF, DDoS)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   Frontend     │ │  Platform API  │ │   Connectors   │
│   (Vercel)     │ │  (Railway)     │ │  (Railway)     │
└────────────────┘ └────────────────┘ └────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Neon/Supabase)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Extension Points

1. **New Box Types**: Add to BoxRegistry
2. **New Connectors**: Implement connector interface
3. **New Tools**: Register in Tool Gateway
4. **New Account Types**: Add to packs
5. **Custom Computations**: Add to DataModelSpec computed_columns
