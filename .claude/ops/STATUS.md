# Platform Status

**Last Updated:** 2025-12-25

---

## Source of Truth

**Before claiming new work, confirm it's still the top priority here.**

---

## Current Milestone

**M2: Data Layer + Agent Runtime**

| Issue | Title | Status | Assignee |
|-------|-------|--------|----------|
| #6 | M2.1 DDL Generator | 🔲 Not started | - |
| #7 | M2.2 Platform API DB | 🔲 Not started | - |
| #8 | M2.3 Agent Runtime | 🔲 Not started | - |
| #9 | M2.4 Integration Test | 🔲 Not started | - |
| #10 | M2 Definition of Done | 🔲 Checklist | - |

**North Star:** `data.insert_row` → row appears in TableBox

**Build Order:** #6 → #7 → #8 → #9

---

## Next Actions (Priority Order)

1. **Claim issue #6** (DDL Generator)
2. Bootstrap database (see below)
3. Build DataModelSpec → PostgreSQL DDL generator
4. Generate migration for client1_sales_report
5. Apply migration, verify table/view created

---

## Database Bootstrap

**Required before M2 work:**

```bash
# 1. Create docker-compose.yml in repo root (if not exists)
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: roni
      POSTGRES_PASSWORD: roni
      POSTGRES_DB: roni_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# 2. Start Postgres
docker compose up -d postgres

# 3. Set DATABASE_URL in packages/platform-api/.env
echo 'DATABASE_URL="postgresql://roni:roni@localhost:5432/roni_platform"' >> packages/platform-api/.env

# 4. Initialize Prisma (after schema is added in M2.2)
cd packages/platform-api && pnpm prisma migrate dev
```

---

## Completed Milestones

### M1: Platform Foundation ✅

- [x] shared-contracts: Zod schemas, DataModelSpec, PreviewPlan, fixtures
- [x] platform-api: Tool Gateway, PageConfig endpoints, in-memory fixtures
- [x] frontend: PageRenderer, BoxRegistry, TableBox, modals, formatters

---

## Environment Health

| Service | Status | Notes |
|---------|--------|-------|
| platform-api | 🔲 Local only | http://localhost:3001 |
| frontend | 🔲 Local only | http://localhost:3000 |
| postgres | 🔲 Not set up | Run docker compose (see above) |

---

## Blockers

_None currently_

---

## Session Log

### 2025-12-25

- Created monorepo at roni-ai-superapp/roni-ai-platform
- Added 13 submodules (packages + services)
- Created documentation: README, ROADMAP, ARCHITECTURE, CONTRIBUTING
- Created agent context: .claude/AGENT_CONTEXT.md
- Created milestone issues #1-#5 (M1-M5)
- Created M2 sub-issues #6-#10 with detailed specs
- Set up ops structure: CLAUDE.md, AGENTS.md, STATUS.md, DEV_WORKFLOW.md
- Added GitHub labels: in-progress, blocked, ready-for-review, pending-ci, tech-debt, M1-M5

---

## Quick Commands

```bash
# Check open issues
gh issue list --repo roni-ai-superapp/roni-ai-platform --state open

# Check CI status (when set up)
gh run list --repo roni-ai-superapp/roni-ai-platform --limit 5

# Start development
cd packages/platform-api && pnpm dev  # :3001
cd packages/frontend && pnpm dev      # :3000

# Test golden path
open http://localhost:3000/pages/sales-report
```
