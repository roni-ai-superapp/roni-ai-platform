# Platform Status

**Last Updated:** 2025-12-26

---

## Source of Truth

**Before claiming new work, confirm it's still the top priority here.**

---

## Current Milestone

**M3: Accounting Engine** 🚧 (Ready to Start)

| Issue | Title | Status | Assignee |
|-------|-------|--------|----------|
| #3 | M3 Epic | 🔲 Planned | - |
| #16 | M3.1 Source Event Bridge | 🔲 Not started | - |
| #17 | M3.2 Posting Rules | 🔲 Not started | - |
| #18 | M3.3 Auto-Posting Worker | 🔲 Not started | - |
| #19 | M3.4 Trial Balance + Statements | 🔲 Not started | - |
| #20 | M3.5 Integration Test + DoD | 🔲 Not started | - |

**Build Order:** #16 → #17 → #18 → #19 → #20

**North Star:** Data insert → Journal entry generated → Posted → Appears in Trial Balance

---

## Next Actions (Priority Order)

1. **Start M3.1** (#16) - Source Event Bridge
2. **Address #13** - Database architecture review (tech-debt)

---

## Completed: M2 Data Layer + Agent Runtime ✅

| Issue | Title | Status |
|-------|-------|--------|
| #6 | M2.1 DDL Generator | ✅ Complete |
| #7 | M2.2 Platform API DB | ✅ Complete |
| #8 | M2.3 Agent Runtime | ✅ Complete |
| #9 | M2.4 Integration Test | ✅ 10/10 tests pass |
| #10 | M2 Definition of Done | ✅ Verified |
| #14 | Display bug fix | ✅ Fixed |
| #15 | Schema mismatch fix | ✅ Fixed |

**All issues have 👀 needs-eyeballs label - awaiting human review to close.**

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

| Service | Status | URL |
|---------|--------|-----|
| platform-api | ✅ Railway | https://platform-api-dev-9a40.up.railway.app |
| frontend | ✅ Railway | https://frontend-dev-5e53.up.railway.app |
| postgres | ✅ Railway | Postgres-OG9n |

**Golden Path:** https://frontend-dev-5e53.up.railway.app/pages/sales-report

---

## Blockers

_None currently_

---

## Session Log

### 2025-12-26 (continued)

- Integration tests: 10/10 pass ✅
- Added 👀 needs-eyeballs label to all M2 issues
- Updated DEV_WORKFLOW.md with review gate pattern
- M2 complete, M3 planning started

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
