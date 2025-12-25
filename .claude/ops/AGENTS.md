# Agent Registry

This registry prevents overlap when multiple agents work in parallel.

**Update this file:**
- At the start of work
- When handing off
- When going idle

---

## Active Agents

| Agent | Repo | Issues | Branch | Status | ETA/Checkpoint |
|-------|------|--------|--------|--------|----------------|
| claude-opus | roni-ai-superapp/roni-ai-platform | #6, #7, #8 | main | ready-for-review | 2025-12-25 19:45 UTC |
| agent-9 | roni-ai-superapp/repo-platform-api | #9 | main | ready-for-review | 2025-12-25 - Integration test created |
| agent-10 | roni-ai-superapp/roni-ai-platform | #10 | main | ready-for-review | 2025-12-25 - M2 verified, found bug #15 |
| agent-12 | roni-ai-superapp/roni-ai-platform | #12 | main | ready-for-review | 2025-12-25 - Railway-safe CI added |
| agent-14 | roni-ai-superapp/roni-ai-platform | #14 | main | ready-for-review | 2025-12-25 - Display bug fixed |

**Issues #6, #7, #8 Complete:**
- ✅ DDL tables (payers, clients, reps, sales_report_entries) + sales_report_view
- ✅ Prisma schema with PageConfig, ToolExecution, AuditLog, ViewWhitelist
- ✅ Migrations applied to Railway Postgres (Postgres-OG9n)
- ✅ Seed script run (PageConfig, ViewWhitelist, test dimension data)
- ✅ API endpoints return data from DB with BigInt/Decimal/Date serialization
- ✅ Frontend displays live data from Postgres
- ✅ CORS configured for frontend domain
- ✅ DATABASE_OPS.md with Railway CLI limitations documented
- ✅ Verification screenshots posted inline to both issues
- ✅ ToolExecutor implemented with data.insert_row support
- ✅ Tool Gateway integration for data mutation tools
- ✅ Data tool schemas added to shared-contracts
- ✅ Railway deployment verified (SHA: feface4)

**Issue #10 M2 Verification Complete:**
- ✅ M2.1 DDL Generator - Complete
- ✅ M2.2 Platform API DB - Complete
- ⚠️ M2.3 Agent Runtime - 85% complete, blocked by #15 (schema mismatch)
- ⏳ M2.4 Integration Test - Not started, blocked by #15
- 📝 Created bug issue #15 for schema mismatch

**Issue #12 Complete (Railway-safe CI):**
- Added `scripts/check-deps.mjs` to services/plaid, plaid-frontend, accounting-db
- Added `check:deps` and `precommit` scripts to package.json files
- Updated CI workflows to run Railway-safe validation on PRs
- Added check-deps to packages/data-ingestion for future use
- Documented workspace:* issue in data-ingestion that needs fixing before Railway deploy
- All health endpoints verified working (platform-api, frontend)

**Issue #14 Complete (Display Bug Fix):**
- Root cause: Column definitions used dot notation (`payer.name`) but DB view returns `payer_name`
- Fixed `packages/platform-api/src/app_config/fixtures.ts` - changed field mappings
- Fixed `packages/shared-contracts/fixtures/pageconfig/client1_sales_report_page.json`
- TypeScript typecheck and lint pass

**Issue #9 Progress (Integration Test):**
- Created `packages/platform-api/tests/integration/m2-vertical-slice.test.ts` (400+ lines)
- Created `packages/platform-api/vitest.config.ts`
- Tests cover: preview/confirm flow, idempotency, audit log, whitelist enforcement
- Blocked by #15 (schema mismatch) - tests document expected behavior

---

## Status Values

These match GitHub labels for consistency:

| Status | GitHub Label | Meaning |
|--------|--------------|---------|
| `active` | `in-progress` | Currently working on the issue |
| `blocked` | `blocked` | Waiting on external dependency |
| `pending-ci` | `pending-ci` | Waiting for CI to complete |
| `ready-for-review` | `ready-for-review` | Code complete, awaiting human verification |
| `idle` | _(none)_ | Available for new work |
| `handoff` | _(none)_ | Passing work to another agent |

---

## Claiming an Issue

```bash
# 1. Check this registry for conflicts
cat .claude/ops/AGENTS.md

# 2. Assign yourself (use correct repo!)
gh issue edit <number> --add-assignee @me --repo roni-ai-superapp/<repo>

# 3. Add in-progress label
gh issue edit <number> --add-label "in-progress" --repo roni-ai-superapp/<repo>

# 4. Comment with claim (include UTC timestamp!)
gh issue comment <number> --repo roni-ai-superapp/<repo> --body "Claimed by <agent-name> until 2025-12-27 17:00 UTC.
Repo: roni-ai-superapp/<repo>
Scope: <files/areas>
Branch: agent/<name>/issue-###-slug"

# 5. Update this file with your entry
```

**Lease default:** 48 hours. Renew with a new comment if needed.

---

## Releasing a Claim

When done or handing off:

1. Update this file (set status to `idle` or `handoff`)
2. Comment on the issue with current status
3. Update label if appropriate (`ready-for-review`, remove `in-progress`)

---

## Ready-for-Review Checklist

Before setting status to `ready-for-review`:

- [ ] Tests + typecheck pass (or tracking issue exists)
- [ ] PR open with description
- [ ] This file updated with `ready-for-review` status and PR link

---

## Conflict Avoidance

- Do not modify files claimed by another agent
- If overlapping changes needed, coordinate in issue comments first
- Check this registry before claiming new work
