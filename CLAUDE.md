# Claude Code Project Instructions

## Non-Negotiables (Top of Every Session)

- **Do NOT close issues** unless a human explicitly directs it
- **No secrets, no data deletion** without explicit approval
- **No "done" without verification** (tests pass, golden path works)
- **48h issue lease + AGENTS.md registry is mandatory** before changing code

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| `.claude/AGENT_CONTEXT.md` | Full technical context for the platform |
| `.claude/ops/STATUS.md` | Current status, priorities (source of truth) |
| `.claude/ops/AGENTS.md` | Agent registry for multi-agent coordination |
| `.claude/ops/DEV_WORKFLOW.md` | Development workflow and protocols |
| `ROADMAP.md` | What's done, what's next |

---

## 1) Session Start Protocol

**Every session MUST start with these steps:**

```bash
# Set default repo
export GH_REPO=roni-ai-superapp/roni-ai-platform

# Go to repo (portable path)
cd ~/roni-ai/roni-ai-platform

# Update submodules
git submodule update --remote --merge

# Read status (source of truth for priorities)
cat .claude/ops/STATUS.md | head -50

# Check open issues
gh issue list --state open --limit 15

# Check agent registry for conflicts
cat .claude/ops/AGENTS.md
```

---

## 2) Creating a New Issue (No Implementation)

Use this when starting something new. Create the issue first, implement later.

```text
You are an agent.

1) Read:
   - .claude/ops/DEV_WORKFLOW.md
   - .claude/ops/STATUS.md
   - .claude/AGENT_CONTEXT.md (skim relevant areas)

2) Decide the correct repo:
   - Package-specific → package repo (repo-frontend, repo-platform-api, 1-shared-contracts)
   - Cross-cutting → monorepo (roni-ai-platform)

3) Search existing issues to avoid duplicates.

4) Create ONE GitHub issue (do NOT implement):
   - Title
   - Summary
   - Scope (packages/files)
   - Acceptance Criteria (checkboxes)
   - Verification steps (golden path if UI/API touched)
   - Labels (bug/enhancement/tech-debt + milestone label)

5) Comment on the issue with assumptions + open questions.
```

---

## 3) Claiming + Implementing an Issue

Use this for the main implementation loop.

```text
You are an agent.

First read:
- .claude/ops/DEV_WORKFLOW.md
- .claude/ops/STATUS.md

Then:
1) List open issues (newest first) in the correct repo.
2) Pick the first unclaimed issue (no "Claimed by ... until ..." comment).
3) Acknowledge: "Acknowledged. Working this now."
4) Claim with 48h lease:
   - Add assignee
   - Add label: in-progress
   - Add claim comment with Repo, Scope, Branch, UTC timestamp
5) Update .claude/ops/AGENTS.md (status=active, issue #, branch, checkpoint).

Implementation rules:
- Branch: agent/<name>/issue-###-short-slug
- Failing tests/lint/typecheck → fix or file tech-debt issue
- Merge only after PR rebased on main + checks green
- Do NOT close the issue

Verification:
- Run tests/typecheck/lint in impacted packages
- Run golden path smoke test when relevant
- Post results in PR description + issue comment
```

---

## 4) Investigation / Spike (No Code)

Use this for ambiguous work before implementation.

```text
You are an agent.

Read:
- .claude/ops/DEV_WORKFLOW.md
- .claude/ops/STATUS.md
- .claude/AGENT_CONTEXT.md
- docs/ARCHITECTURE.md (relevant sections)

Task: Investigate <topic> and produce a report (no code changes):
- Current state (files/paths)
- Constraints (schemas, tool gateway, submodules, validation)
- Proposed approach (1 recommended, avoid option-spam)
- Risk list + mitigations
- Concrete "next issues" to file (titles + acceptance criteria)

Ground proposals in the vertical-slice principle:
prompt → schema → table/view → page → statements
```

---

## 5) Breaking Down Complex Features (Epic)

Use this to split a big request into trackable sub-issues.

```text
You are an agent.

First read:
- .claude/ops/DEV_WORKFLOW.md
- .claude/ops/STATUS.md

Break the feature into smaller GitHub issues. For each:
- Title
- Repo (monorepo vs package repo)
- Scope (packages/files)
- Dependencies (explicit)
- Acceptance criteria
- Verification steps

Search existing issues to avoid duplicates.
Create a parent "epic" issue and link sub-issues.
Do NOT implement any code.
```

---

## 6) Repo Routing (Critical)

**Before any `gh` command, determine the correct repo:**

| Issue Type | Repo |
|------------|------|
| Frontend bugs/features | `roni-ai-superapp/repo-frontend` |
| API bugs/features | `roni-ai-superapp/repo-platform-api` |
| Schema changes | `roni-ai-superapp/1-shared-contracts` |
| Milestones, integration | `roni-ai-superapp/roni-ai-platform` |

```bash
# Override for package-specific work
gh issue list --repo roni-ai-superapp/repo-frontend
```

---

## 7) Submodule Two-PR Rule

**If code changes are inside `packages/<x>` (a submodule):**

1. Branch + push **inside the submodule**
2. PR + merge in the **submodule repo**
3. Bump pointer in parent repo + PR/merge that

```bash
# 1. Work in submodule
cd packages/frontend
git checkout -b agent/<name>/issue-###-slug
git commit -m "feat: ..."
git push origin agent/<name>/issue-###-slug

# 2. PR in submodule repo
gh pr create --repo roni-ai-superapp/repo-frontend

# 3. After merge, bump parent
cd ../..
git add packages/frontend
git commit -m "chore: bump frontend submodule"
git push
```

---

## 8) Testing Protocol (Local Only)

**No Playwright/deploy checks yet.** Use unit → integration → manual.

### Minimum bar before PR:

```bash
# Per impacted package
cd packages/platform-api && pnpm test && pnpm typecheck && pnpm lint
cd packages/frontend && pnpm test && pnpm typecheck && pnpm lint
cd packages/shared-contracts && pnpm test
```

### Golden Path Smoke Test (when UI/API touched):

```bash
# Terminal 1
cd packages/platform-api && pnpm dev  # :3001

# Terminal 2
cd packages/frontend && pnpm dev      # :3000

# Browser
open http://localhost:3000/pages/sales-report
```

---

## 9) Error Handling (Non-Optional)

When tests/lint/typecheck fail:

1. **Fix** - If straightforward
2. **File tech-debt issue** - If complex/unrelated
3. **Justify + track** - Explain why it doesn't block AND create issue

**"No action" is never acceptable.**

---

## 10) Ready-for-Review Gate

Before applying `ready-for-review` label, **all must be true:**

1. Tests + typecheck pass (or tracking issue exists)
2. PR open with description
3. AGENTS.md updated with `ready-for-review` status + PR link

---

## 11) Session End Protocol

1. Commit WIP: `git commit -m "WIP: description"`
2. Update `.claude/ops/STATUS.md` (session log)
3. Update `.claude/ops/AGENTS.md` (status = idle/handoff)
4. Post issue comment with current state
5. Push all changes

---

## 12) Claim Comment Template

```
Claimed by <agent-name> until 2025-12-27 17:00 UTC.
Repo: roni-ai-superapp/<repo>
Scope: <packages/files>
Branch: agent/<name>/issue-###-slug
```

---

## Current Milestone

**M2: Data Layer + Agent Runtime**

Build order: #6 → #7 → #8 → #9

North Star: `data.insert_row` → row appears in TableBox
