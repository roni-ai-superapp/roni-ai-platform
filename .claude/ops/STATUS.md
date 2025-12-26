# Platform Status

**Last Updated:** 2025-12-26

---

## Source of Truth

**Before claiming new work, confirm it's still the top priority here.**

---

## Current Milestone

**M2: Data Layer + Agent Runtime** ✅ (90% Complete)

| Issue | Title | Status | Assignee |
|-------|-------|--------|----------|
| #6 | M2.1 DDL Generator | ✅ Complete | claude-opus |
| #7 | M2.2 Platform API DB | ✅ Complete | claude-opus |
| #8 | M2.3 Agent Runtime | ✅ Complete | claude-opus |
| #9 | M2.4 Integration Test | ✅ Tests written | agent-9 |
| #10 | M2 Definition of Done | ✅ Verified | agent-10 |

**North Star:** `data.insert_row` → row appears in TableBox ✅

**Completed Work:**
- DDL tables (payers, clients, reps, sales_report_entries) + sales_report_view
- Prisma schema with PageConfig, ToolExecution, AuditLog, ViewWhitelist
- Migrations applied to Railway Postgres
- API endpoints return data from DB
- ToolExecutor with data.insert_row support
- Integration tests for preview/confirm flow
- Schema fix (#15) - validator aligned with executor

---

## Next Actions (Priority Order)

1. **Run integration tests with database** (verify end-to-end)
2. **Close completed M2 issues** (#6, #7, #8, #9, #10)
3. **Plan M3: Accounting Engine**

---

## Bug Fixes Completed

| Issue | Title | Status |
|-------|-------|--------|
| #14 | Display bug: Payer/Client/Rep columns | ✅ Fixed |
| #15 | Schema mismatch validator/executor | ✅ Fixed |

---

## Infrastructure Completed

| Issue | Title | Status |
|-------|-------|--------|
| #12 | Railway-safe CI | ✅ Added to all repos |

---

## Database

**Railway Postgres (Production):** Connected and seeded

```bash
# Local development
DATABASE_URL="postgresql://roni:roni@localhost:5432/roni_platform"

# Run migrations
cd packages/platform-api && pnpm prisma migrate dev
```

---

## Completed Milestones

### M1: Platform Foundation ✅

- [x] shared-contracts: Zod schemas, DataModelSpec, PreviewPlan, fixtures
- [x] platform-api: Tool Gateway, PageConfig endpoints, in-memory fixtures
- [x] frontend: PageRenderer, BoxRegistry, TableBox, modals, formatters

### M2: Data Layer + Agent Runtime ✅ (90%)

- [x] DDL Generator: DataModelSpec → PostgreSQL tables/views
- [x] Platform API DB: Prisma schema, migrations, seed data
- [x] Agent Runtime: ToolExecutor with data.insert_row
- [x] Tool Gateway: Preview/confirm flow, idempotency, audit log
- [x] Integration tests: 10 tests covering vertical slice
- [ ] End-to-end verification with live database

---

## Environment Health

| Service | Status | Notes |
|---------|--------|-------|
| platform-api | ✅ Railway | https://platform-api.railway.app |
| frontend | ✅ Railway | https://frontend.railway.app |
| postgres | ✅ Railway | Postgres-OG9n |

---

## Blockers

_None currently_

---

## Session Log

### 2025-12-26

- Fixed #15: Schema mismatch between validator and executor
- Merged all pending submodule changes
- Updated submodule pointers: platform-api, shared-contracts, data-ingestion, plaid, plaid-frontend, accounting-db
- Railway-safe CI added to all repos

### 2025-12-25

- Created monorepo at roni-ai-superapp/roni-ai-platform
- Added 13 submodules (packages + services)
- Completed M2 issues #6, #7, #8 (DDL, DB, Agent Runtime)
- Created integration tests (#9)
- Verified M2 milestone (#10), found bug #15
- Added Railway-safe CI (#12)
- Fixed display bug (#14)

---

## Quick Commands

```bash
# Check open issues
gh issue list --repo roni-ai-superapp/roni-ai-platform --state open

# Check CI status
gh run list --repo roni-ai-superapp/roni-ai-platform --limit 5

# Start development
cd packages/platform-api && pnpm dev  # :3001
cd packages/frontend && pnpm dev      # :3000

# Run integration tests
cd packages/platform-api && pnpm test

# Test golden path
open http://localhost:3000/pages/sales-report
```
