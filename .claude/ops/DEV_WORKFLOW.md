# Development Workflow

**For AI Agents and Human Developers**

This document defines the standard workflow for working on the Roni AI Platform.

---

## ⛔ CRITICAL: AI Agent Constraints

**AI agents MUST NOT:**
1. **Close issues without explicit human direction**
2. **Delete data** without explicit human approval
3. **Push secrets or credentials**
4. **Claim "done" without verification**

**AI agents CAN:**
1. Create issues
2. Write code and commit
3. Merge PRs when CI is green
4. Add labels
5. Comment on issues with status updates

---

## Multi-Agent Coordination (REQUIRED)

### 1) Claiming Work (Issue Lease)

Before starting:

```bash
# 1. Check agent registry
cat .claude/ops/AGENTS.md

# 2. Assign yourself to the issue
gh issue edit <number> --add-assignee @me --repo roni-ai-superapp/<repo>

# 3. Add in-progress label
gh issue edit <number> --add-label "in-progress" --repo roni-ai-superapp/<repo>

# 4. Comment with claim
gh issue comment <number> --repo roni-ai-superapp/<repo> --body "Claimed by <agent-name> until <YYYY-MM-DD>.
Repo: roni-ai-superapp/<repo>
Scope: <files/areas>
Branch: agent/<name>/issue-###-slug"

# 5. Update AGENTS.md
```

**Lease default:** 48 hours. Renew with a comment if needed.

### 2) Agent Registry

Update `.claude/ops/AGENTS.md` at the start of work:
- Agent name
- Repo (roni-ai-superapp/...)
- Active issue(s)
- Branch
- Status
- ETA or checkpoint time

### 3) Branch & Merge Protocol

**Branch naming:**
```
agent/<name>/issue-###-short-slug
```

**Merge rules (all must be true):**
- PR is rebased on `main`
- CI is green (no failing checks)
- Issue has a fresh claim (<= 48h)
- AGENTS.md is up to date

### 4) Direct Push to `main` (Exception Only)

**Allowed only for:**
- Docs-only changes
- Single-file, low-risk fixes

If you push to `main`, you MUST:
- Update STATUS.md session log
- Post a GitHub issue comment

### 5) Conflict Avoidance

- Do not modify files claimed by another agent
- If overlapping changes needed, coordinate in issue comments first

---

## Issue Lifecycle

```
Created → Claimed → In Progress → PR Open → Merged → Verified → Closed
                                                         ↑
                                    Human verification ──┘
```

**Close issues only when directed by a human.**

---

## Development Workflow

### Before Making Changes

```bash
# 1. Update submodules
git submodule update --remote --merge

# 2. Check you're on the right branch
git status

# 3. Create a feature branch
git checkout -b agent/<name>/issue-###-slug
```

### While Working

1. **Read before modifying** - Always read a file before editing
2. **Run tests frequently** - After each significant change
3. **Update todo list** - Track progress
4. **Commit logical units** - Don't wait until everything is done

### Test Requirements

| Change Type | Required Tests |
|-------------|----------------|
| Bug fix | Run related tests + full suite |
| New feature | Add tests + run full suite |
| Refactor | Run full suite |

```bash
# Run tests in a package
cd packages/platform-api && pnpm test

# Type check
cd packages/platform-api && pnpm typecheck

# Lint
cd packages/platform-api && pnpm lint
```

---

## Commit Protocol

### Commit Message Format

```
<type>(<scope>): <description> (#issue)

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `docs:` - Documentation
- `chore:` - Maintenance

### When to Commit

| Situation | Commit? |
|-----------|---------|
| Feature complete | YES |
| Bug fix complete | YES |
| Tests added | YES |
| WIP end of session | YES (use `WIP:` prefix) |

---

## Working with Submodules

### Making Changes in a Package

```bash
# 1. Navigate to submodule
cd packages/frontend

# 2. Create branch
git checkout -b agent/<name>/issue-###-slug

# 3. Make changes, commit
git add . && git commit -m "feat: ..."

# 4. Push submodule
git push origin agent/<name>/issue-###-slug

# 5. Create PR in submodule repo
gh pr create --repo roni-ai-superapp/repo-frontend

# 6. After merge, update parent repo
cd ../..
git add packages/frontend
git commit -m "chore: update frontend submodule"
git push
```

### Pulling Latest Submodule Changes

```bash
# Update all submodules
git submodule update --remote --merge

# Or update specific submodule
cd packages/frontend && git pull origin main
```

---

## Error Handling Policy

When running `pnpm tsc`, `pnpm test`, `pnpm lint`:

**"No action" is never acceptable.** You must:

1. **Fix** - If errors are straightforward
2. **Create Issue** - If errors are complex/unrelated, create issue with `tech-debt` label
3. **Justify Proceeding** - Explicitly state why errors don't affect current work AND create tracking issue

**Never** dismiss errors without tracking them.

---

## Session End Protocol

Before ending a session:

1. **Commit all pending work**
   ```bash
   git add . && git commit -m "WIP: description"
   git push origin <branch>
   ```

2. **Update STATUS.md**
   - Add session log entry
   - Update milestone status

3. **Update GitHub issues**
   ```bash
   gh issue comment <number> --body "Session update: ..."
   ```

4. **Update AGENTS.md**
   - Set status to `idle` or `handoff`

---

## Multi-Repo Issue References

This is a monorepo with submodules. Always specify the repo:

```bash
# Monorepo issues (cross-cutting, milestones)
gh issue list --repo roni-ai-superapp/roni-ai-platform

# Package-specific issues
gh issue list --repo roni-ai-superapp/repo-frontend
gh issue list --repo roni-ai-superapp/repo-platform-api
gh issue list --repo roni-ai-superapp/1-shared-contracts
```

**Where to create issues:**

| Issue Type | Repo |
|------------|------|
| Milestone tracking | roni-ai-platform |
| Cross-package integration | roni-ai-platform |
| Frontend bugs/features | repo-frontend |
| API bugs/features | repo-platform-api |
| Schema changes | 1-shared-contracts |

---

## Checklist Templates

### New Session Checklist

- [ ] Read STATUS.md
- [ ] Check agent registry (AGENTS.md)
- [ ] Update submodules
- [ ] Check open issues
- [ ] Identify priority work
- [ ] Claim issue and update AGENTS.md

### Pre-Commit Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Commit message follows format
- [ ] Issue number referenced

### Session End Checklist

- [ ] All work committed
- [ ] STATUS.md updated
- [ ] GitHub issues updated
- [ ] Changes pushed
- [ ] AGENTS.md updated (status = idle)

---

*Last Updated: 2025-12-25*
