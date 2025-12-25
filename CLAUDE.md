# Claude Code Project Instructions

## Quick Reference

| Document | Purpose |
|----------|---------|
| `.claude/AGENT_CONTEXT.md` | Full technical context for the platform |
| `.claude/ops/STATUS.md` | Current status, active work, blockers |
| `.claude/ops/AGENTS.md` | Agent registry for multi-agent coordination |
| `.claude/ops/DEV_WORKFLOW.md` | Development workflow and protocols |
| `ROADMAP.md` | What's done, what's next |

---

## Session Start Protocol

**Every session MUST start with these steps:**

```bash
# 1. Go to the monorepo (use portable path)
cd ~/roni-ai/roni-ai-platform
# Or from anywhere inside the repo:
cd "$(git rev-parse --show-toplevel)"

# 2. Update submodules
git submodule update --remote --merge

# 3. Read status (this is the source of truth for "what's next")
cat .claude/ops/STATUS.md | head -50

# 4. Check open issues
gh issue list --repo roni-ai-superapp/roni-ai-platform --state open --limit 15

# 5. Check agent registry for conflicts
cat .claude/ops/AGENTS.md

# 6. Confirm your planned work is still top priority in STATUS.md
# 7. Register yourself (add entry to AGENTS.md)
```

---

## Issue-Driven Development

All work follows an issue-driven workflow.

### 1. Claiming Issues

**Before starting work:**

1. **Confirm priority** - Check `.claude/ops/STATUS.md` to ensure issue is still top priority
2. Assign yourself to the issue
3. Comment on the issue with UTC timestamp:
   ```
   Claimed by <agent-name> until 2025-12-27 17:00 UTC.
   Repo: roni-ai-superapp/<repo>
   Scope: <files/areas>
   Branch: agent/<name>/issue-###-slug
   ```
4. Add label: `in-progress`
5. Update `.claude/ops/AGENTS.md`

**Lease default:** 48 hours. Renew with a comment if needed.

### 2. Repo Routing (Critical)

**Before running any `gh` command, determine the correct repo:**

- **Package-specific issues** → package repo
- **Cross-cutting issues** → monorepo

| Issue Type | Repo |
|------------|------|
| Frontend bugs/features | `roni-ai-superapp/repo-frontend` |
| API bugs/features | `roni-ai-superapp/repo-platform-api` |
| Schema changes | `roni-ai-superapp/1-shared-contracts` |
| Milestones, integration | `roni-ai-superapp/roni-ai-platform` |

```bash
# Set default repo (override per-package as needed)
export GH_REPO=roni-ai-superapp/roni-ai-platform

# Or use --repo flag explicitly
gh issue list --repo roni-ai-superapp/repo-frontend
```

### 3. Submodule Two-PR Rule

**If you change code inside `packages/<name>` (a submodule):**

1. The PR must land in the **submodule repo first**
2. Then bump the gitlink in the **parent repo**

```bash
# 1. Work in submodule
cd packages/frontend
git checkout -b agent/<name>/issue-###-slug
# ... make changes ...
git commit -m "feat: ..."
git push origin agent/<name>/issue-###-slug

# 2. Create PR in submodule repo
gh pr create --repo roni-ai-superapp/repo-frontend

# 3. After PR merges, update parent
cd ../..
git add packages/frontend
git commit -m "chore: bump frontend submodule"
git push
```

### 4. Working Issues

**Workflow:**
1. Create a branch: `agent/<name>/issue-###-slug`
2. Implement with tests
3. Commit with issue reference: `fix(component): description (#123)`
4. Open PR; merge to `main` after CI passes
5. Update issue with status
6. **Close issues only when explicitly directed by a human**

---

## AI Agent Constraints

**AI agents MUST NOT:**
1. Close issues without explicit human direction
2. Delete data without explicit human approval
3. Push secrets or credentials
4. Mark issues "complete" without verification

**AI agents CAN:**
1. Create issues
2. Write code and commit
3. Merge PRs when CI is green
4. Add labels
5. Comment on issues with status updates

---

## Ready-for-Review Gate (Strict)

Before applying the `ready-for-review` label, **all three must be true:**

1. **Tests + typecheck pass** (or a tracking issue exists for failures)
2. **PR open** with description (+ screenshots/logs if UI-affecting)
3. **AGENTS.md updated** with status `ready-for-review` and link to PR

```bash
# Only after all three are true:
gh issue edit <number> --add-label "ready-for-review" --repo <repo>
```

---

## Branch & Merge Protocol

**Branch naming:**
```
agent/<name>/issue-###-short-slug
```

**Merge rules:**
- PR must be rebased on `main`
- CI must be green
- Issue must have a fresh claim (<= 48h)
- AGENTS.md must be up to date

**Direct push to `main` allowed only for:**
- Docs-only changes
- Single-file, low-risk fixes

---

## Commit Message Format

```
<type>(<scope>): <description> (#issue)

Types: feat, fix, refactor, docs, test, chore
```

Examples:
```
feat(data-ingestion): add DDL generator for DataModelSpec (#6)
fix(platform-api): handle null cost in revenue calculation (#7)
docs(shared-contracts): add business rules documentation
```

---

## Error Handling Policy

When running `pnpm tsc`, `pnpm test`, `pnpm lint`:

**"No action" is never acceptable.** You must:

1. **Fix** - If errors are straightforward
2. **Create Issue** - If errors are complex or unrelated
3. **Justify Proceeding** - Explicitly state why errors don't affect current work AND create tracking issue

**Never** dismiss errors with:
- "These are pre-existing errors"
- "The build still works"

Without taking action to track them.

---

## Testing Protocol

```
┌─────────────────────────────────────┐
│     3. Manual Testing (Human)       │  ← Last
├─────────────────────────────────────┤
│     2. Integration Tests            │
├─────────────────────────────────────┤
│     1. Unit Tests                   │  ← First
└─────────────────────────────────────┘
```

### Running Tests

```bash
# Run tests in a package
cd packages/shared-contracts && pnpm test
cd packages/platform-api && pnpm test
cd packages/frontend && pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Database Bootstrap (M2+)

```bash
# Start Postgres
docker compose up -d postgres

# Set DATABASE_URL in packages/platform-api/.env
# DATABASE_URL=postgresql://user:pass@localhost:5432/roni_platform

# Run migrations
cd packages/platform-api && pnpm prisma migrate dev
```

### Golden Path Test (M2+)

```bash
# Start services
cd packages/platform-api && pnpm dev  # :3001
cd packages/frontend && pnpm dev      # :3000

# Visit http://localhost:3000/pages/sales-report
```

---

## Session End Protocol

Before ending a session:

1. **Commit all pending work**
   ```bash
   git add . && git commit -m "WIP: description"
   ```

2. **Update STATUS.md**
   ```bash
   # Add session log entry
   ```

3. **Update GitHub issues** with current status

4. **Push all changes**
   ```bash
   git push origin <branch>
   ```

5. **Update AGENTS.md** - Set status to `idle` or `handoff`

---

## File Locations

| Purpose | Location |
|---------|----------|
| Technical context | `.claude/AGENT_CONTEXT.md` |
| Status (source of truth) | `.claude/ops/STATUS.md` |
| Agent registry | `.claude/ops/AGENTS.md` |
| Workflow | `.claude/ops/DEV_WORKFLOW.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Roadmap | `ROADMAP.md` |

---

## Package Structure

```
roni-ai-platform/
├── packages/                    # Core platform (submodules)
│   ├── shared-contracts/        # Zod schemas, types
│   ├── platform-api/            # Fastify API
│   ├── frontend/                # Next.js UI
│   ├── agent-runtime/           # Tool execution
│   ├── worker/                  # Background jobs
│   ├── data-ingestion/          # DDL generation
│   └── accounting-core/         # Ledger, statements
├── services/                    # Existing services to migrate
│   ├── plaid/                   # ~80% done
│   ├── stripe/                  # ~75% done
│   └── accounting-db/           # ~80% done
└── infra/                       # Infrastructure
```

---

## Current Milestone

**M2: Data Layer + Agent Runtime**

See issues #6-#10 for details.

Build order:
1. #6 - DDL Generator
2. #7 - Platform API DB
3. #8 - Agent Runtime
4. #9 - Integration Test
