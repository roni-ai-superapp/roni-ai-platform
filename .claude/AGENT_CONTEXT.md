# Agent Context - Roni AI Platform

This document provides full context for AI agents working on this platform.

## What Is This Platform?

Roni AI is an **AI-first, config-driven finance platform** for multi-tenant SaaS. Instead of writing custom code for each client's reports and workflows, we:

1. AI generates a **DataModelSpec** from natural language prompts
2. DataModelSpec generates PostgreSQL tables, views, and PageConfigs
3. **PageRenderer** renders pages from PageConfig JSON
4. **Tool Gateway** allows AI agents to safely execute mutations
5. **Accounting Engine** auto-generates journal entries and statements

## Current State (Day 1 Complete)

### What's Working

1. **shared-contracts** (`packages/shared-contracts/`)
   - Zod schemas for DataModelSpec, PreviewPlan, PageConfig, BoxSpec
   - Money module with minor units and HALF_UP rounding
   - Fixtures for Client 1 Sales Report
   - JSON Schema generation (`pnpm build:schemas`)

2. **platform-api** (`packages/platform-api/`)
   - Fastify server on port 3001
   - `POST /tools/execute` - Tool Gateway with Ajv validation
   - `GET /app-config/pages/:slug` - PageConfig by slug
   - `GET /app-config/data/:view` - Paginated view data
   - `GET /app-config/lookup/:table` - Lookup table data
   - Confirmation flow with preview/confirm tokens
   - In-memory fixtures (Day 1)

3. **frontend** (`packages/frontend/`)
   - Next.js 14 on port 3000
   - `PageRenderer` - config-driven page rendering
   - `BoxRegistry` - extensible box type system
   - `TableBox` - pagination, sorting, money/percent formatting
   - `AddRowModal`, `ConfirmDialog`, `ToolConfirmModal`
   - API client with org context via headers

### What's Not Yet Working

1. **data-ingestion** - DataModelSpec → DDL not implemented
2. **agent-runtime** - Tool execution engine not implemented
3. **accounting-core** - Journal/posting not implemented
4. **Database** - Using in-memory fixtures, no real DB yet
5. **Auth** - Using env vars for org_id, no real auth

## Key Schemas

### DataModelSpec
Defines what the AI generates from a prompt:
```typescript
{
  name: "client1_sales_report",
  description: "Sales report for group buying client",
  base_table: { name, columns: [...] },
  dimension_tables: [...],
  view: { name, columns: [...], computed_columns: [...] },
  auto_lookups: [...],
  accounting_config: { journal_template: [...] }
}
```

### PageConfig
Defines how a page renders:
```typescript
{
  id: "uuid",
  slug: "sales-report",
  title: "Sales Report",
  screen_context: "client1_sales_report",
  boxes: [{ id, type: "table", position, spec }]
}
```

### PreviewPlan
What Tool Gateway returns before destructive actions:
```typescript
{
  preview_id: "uuid",
  tool_id: "data.delete_row",
  summary: "Delete 1 row from sales_report",
  affected_rows: 1,
  warnings: ["Cannot be undone"],
  requires_confirmation: true,
  confirm_token: "abc123"
}
```

## Business Rules (Locked)

| Rule | Decision |
|------|----------|
| Percent storage | 0-100 (not 0-1) |
| Money storage | Minor units (cents) |
| Rounding mode | HALF_UP |
| Commission precedence | Assignment → Rep.default → 0 |
| Revenue formula | GMV - Cost (or GMV if cost null) |
| Org context (v1) | NEXT_PUBLIC_ORG_ID env var |

## File Locations

### Schemas & Types
- `packages/shared-contracts/src/app_builder/` - DataModelSpec
- `packages/shared-contracts/src/tools/` - PreviewPlan
- `packages/shared-contracts/src/page_config/` - PageConfig, BoxSpec
- `packages/shared-contracts/src/money/` - Money utilities

### Fixtures
- `packages/shared-contracts/fixtures/datamodelspec/` - DataModelSpec examples
- `packages/shared-contracts/fixtures/pageconfig/` - PageConfig examples

### API
- `packages/platform-api/src/routes/` - Route handlers
- `packages/platform-api/src/tool_gateway/` - Tool Gateway service
- `packages/platform-api/src/app_config/fixtures.ts` - Day 1 mock data

### Frontend
- `packages/frontend/src/lib/api-client.ts` - API client
- `packages/frontend/src/components/PageRenderer.tsx` - Page renderer
- `packages/frontend/src/components/boxes/TableBox.tsx` - Table component
- `packages/frontend/src/lib/formatters.ts` - Value formatters

## Existing Services to Migrate

These services in `services/` are mature and should be adapted:

### plaid/ (~80% complete)
- Bank account linking
- Transaction sync
- Balance fetching
- Needs: Adapt to shared-contracts types, emit platform events

### stripe/ (~75% complete)
- Payment processing
- Charge sync
- Reconciliation
- Needs: Adapt to shared-contracts, integrate with accounting-core

### accounting-db/ (~80% complete)
- Journal entries
- Account mapping
- Statement generation
- Needs: Extract core logic to accounting-core package

## What To Build Next

### Priority 1: Data Layer (Day 2-3)
1. Prisma schema in platform-api for PageConfig, audit_log
2. DataModelSpec parser in data-ingestion
3. DDL generator (CREATE TABLE, CREATE VIEW)
4. Replace in-memory fixtures with DB queries

### Priority 2: Agent Runtime (Day 3-4)
1. Tool registry with data.insert_row, data.update_row, data.delete_row
2. Tool executor with Ajv validation
3. Permission checks
4. Integration with platform-api

### Priority 3: Accounting (Day 4-5)
1. Journal entry schema
2. Journal generation from DataModelSpec.accounting_config
3. Posting engine
4. TB/P&L/BS generation

## Development Commands

```bash
# From monorepo root
pnpm install                    # Install all dependencies
pnpm dev                        # Start all services

# Individual packages
cd packages/platform-api
pnpm dev                        # Start API on :3001

cd packages/frontend
pnpm dev                        # Start frontend on :3000

cd packages/shared-contracts
pnpm build:schemas              # Generate JSON Schema from Zod
pnpm test                       # Run tests
```

## Testing the Golden Path

```bash
# 1. Start platform-api
cd packages/platform-api && pnpm dev

# 2. Start frontend
cd packages/frontend && pnpm dev

# 3. Visit http://localhost:3000/pages/sales-report
# Should see a table with 3 rows of mock sales data
```

## GitHub Issues

Check these locations for current work:
- https://github.com/roni-ai-superapp/roni-ai-platform/issues (monorepo)
- https://github.com/roni-ai-superapp/repo-frontend/issues (frontend)
- https://github.com/roni-ai-superapp/repo-platform-api/issues (API)
- https://github.com/roni-ai-superapp/1-shared-contracts/issues (schemas)

## Architecture Principles

1. **Config over code** - New screens = new JSON, not new React components
2. **AI-first** - Every action can be triggered by an AI agent
3. **Vertical slices** - Build prompt → statements for one client before horizontalizing
4. **Migrate, don't rebuild** - Strong existing services get adapted, not rewritten
5. **Type safety** - Zod schemas are source of truth, generate everything else
