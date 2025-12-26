# Development Workflow

**For AI Agents (Claude Code) and Human Developers**

---

## Non-Negotiables

Copy these into every agent prompt:

- **Do NOT close issues** unless a human explicitly directs it
- **No secrets, no data deletion** without explicit approval
- **No "done" without verification** (tests pass, golden path works)
- **48h issue lease + AGENTS.md registry is mandatory** before changing code

---

## Issue-Driven Development Loop

All work follows this loop:

```
Check STATUS.md → Find/Create Issue → Claim (48h lease) → Implement → Verify → Mark Ready-for-Review
                                                                                        ↓
                                                                    Human closes when verified
```

---

## 1) Session Start Protocol

```bash
# Set default repo
export GH_REPO=roni-ai-superapp/roni-ai-platform

# Go to repo
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

## 2) Claiming an Issue

**Before any code changes:**

```bash
# 1. Acknowledge in issue
gh issue comment <number> --body "Acknowledged. Working this now."

# 2. Assign yourself
gh issue edit <number> --add-assignee @me --repo roni-ai-superapp/<repo>

# 3. Add in-progress label
gh issue edit <number> --add-label "in-progress" --repo roni-ai-superapp/<repo>

# 4. Post claim comment with UTC timestamp
gh issue comment <number> --repo roni-ai-superapp/<repo> --body "Claimed by <agent-name> until 2025-12-27 17:00 UTC.
Repo: roni-ai-superapp/<repo>
Scope: <packages/files>
Branch: agent/<name>/issue-###-slug"

# 5. Update AGENTS.md
```

**Lease duration:** 48 hours. Renew with new comment if needed.

---

## 3) Repo Routing

**Critical: Determine correct repo before any `gh` command.**

| Issue Type | Repo |
|------------|------|
| Frontend bugs/features | `roni-ai-superapp/repo-frontend` |
| API bugs/features | `roni-ai-superapp/repo-platform-api` |
| Schema changes | `roni-ai-superapp/1-shared-contracts` |
| Milestones, integration, cross-cutting | `roni-ai-superapp/roni-ai-platform` |

---

## 4) Submodule Two-PR Rule

**If code changes are inside `packages/<x>` (a submodule):**

1. Branch + push **inside the submodule**
2. PR + merge in the **submodule repo first**
3. Then bump pointer in parent repo + commit

```bash
# Work in submodule
cd packages/frontend
git checkout -b agent/<name>/issue-###-slug
# ... make changes ...
git commit -m "feat: ..."
git push origin agent/<name>/issue-###-slug

# PR in submodule repo
gh pr create --repo roni-ai-superapp/repo-frontend

# After submodule PR merges, bump parent
cd ../..
git add packages/frontend
git commit -m "chore: bump frontend submodule"
git push
```

---

## 5) Branch Naming

```
agent/<name>/issue-###-short-slug
```

Examples:
- `agent/opus/issue-6-ddl-generator`
- `agent/claude/issue-7-prisma-schema`

---

## 6) Railway-Safe Dependencies (Non-Optional)

**Policy:** No git/SSH-based dependencies in deployable services. Railway builds have no SSH keys.

### Dependency Rules:
- **No git deps:** `github:`, `git+ssh:`, `git@`, `.git` URLs will break Railway
- **Private packages:** Use GitHub Packages with semver versions, not git URLs
- **Required config:** `.npmrc` must exist with registry config for `@roni-ai-superapp` scope
- **Lockfile:** Must be committed for `--frozen-lockfile` to work

### Pre-Commit Checklist (must pass locally):
```bash
# Run before every commit in deployable repos
pnpm check:deps
```

This script catches:
- git/SSH dependencies that will break Railway
- Private scope deps without proper .npmrc config
- Missing lockfiles

### CI Enforcement:
CI runs on **all PRs** to catch Railway failures before merge:
1. `pnpm check:deps` - Railway-safe dependency check
2. `pnpm install --frozen-lockfile` - Clean install (no SSH keys)
3. `pnpm typecheck && pnpm lint && pnpm test`
4. `pnpm build`

**If you change deps, CI must pass a clean install.**

---

## 7) Testing Protocol (Local Only)

**No Playwright/deploy checks yet.** Use unit → integration → manual.

### Minimum bar before PR:

```bash
# Per impacted package
cd packages/platform-api && pnpm check:deps && pnpm test && pnpm typecheck && pnpm lint
cd packages/frontend && pnpm check:deps && pnpm test && pnpm typecheck && pnpm lint
cd packages/shared-contracts && pnpm test
```

### Golden Path Smoke Test:

When UI or API touched:

```bash
# Terminal 1: API
cd packages/platform-api && pnpm dev  # :3001

# Terminal 2: Frontend
cd packages/frontend && pnpm dev      # :3000

# Browser
open http://localhost:3000/pages/sales-report
```

Verify the sales report page loads with data.

---

## 8) Error Handling (Non-Optional)

When tests/lint/typecheck fail:

| Action | When |
|--------|------|
| **Fix** | Errors are straightforward |
| **File tech-debt issue** | Errors are complex or unrelated |
| **Justify + track** | Explain why it doesn't block AND create issue |

**"No action" is never acceptable.**

---

## 9) Merge Rules

PR can be merged when ALL are true:

- [ ] PR rebased on `main`
- [ ] CI green (validates Railway-safe deps + build)
- [ ] Tests + typecheck pass in impacted packages
- [ ] Issue has fresh claim (≤ 48h)
- [ ] AGENTS.md is up to date

**Direct push to `main` only for:**
- Docs-only changes
- Single-file, low-risk fixes

---

## 10) Ready-for-Review Gate

Before applying `ready-for-review` label, ALL must be true:

- [ ] Tests + typecheck + lint pass locally
- [ ] CI green (wait for GitHub Actions to complete)
- [ ] Railway dev deploy successful (verify via health endpoint)
- [ ] Golden path smoke test passes (frontend loads, API returns data)
- [ ] **Screenshot posted in issue comment** (REQUIRED for ALL issues)
- [ ] Verification comment posted with API response + screenshot + checklist
- [ ] AGENTS.md updated with `ready-for-review` status
- [ ] @toddllm and @germeeai tagged for human review

```bash
# Wait for CI to pass
gh run list --repo roni-ai-superapp/<repo> --limit 1

# Check Railway deploy (DEV environment)
curl -s https://platform-api-dev-9a40.up.railway.app/health
# Frontend: https://frontend-dev-5e53.up.railway.app
# Golden path: https://frontend-dev-5e53.up.railway.app/pages/sales-report

# Then mark ready - BOTH labels required
gh issue edit <number> --add-label "ready-for-review" --add-label "👀 needs-eyeballs" --repo <repo>
```

### 👀 needs-eyeballs Label

**REQUIRED** for all issues ready for human review. This pink label signals "take a look!"

The label + "Ready for Human Review" comment together form the review gate.

---

## 10.1) Visual Verification with Screenshots

**Required for ALL issues.** Every issue must have a screenshot in the verification comment.

- **UI changes**: Screenshot the affected page
- **API changes**: Screenshot a frontend page that uses the API
- **No frontend exists**: Create a stub page that calls the API and displays results

Screenshots must be inline (visible in GitHub), not links.

### Taking a Screenshot

```bash
# From monorepo root, uses Playwright
cd /tmp && npm init -y && npm install playwright
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://frontend-dev-5e53.up.railway.app/pages/sales-report', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/screenshot.png', fullPage: true });
  await browser.close();
})();
"
```

### Making Screenshots Inline in GitHub Issues

For images to render inline (not as links), commit to repo and use raw URL:

```bash
# 1. Copy to repo
mkdir -p docs/screenshots
cp /tmp/screenshot.png docs/screenshots/issue-<N>-<name>-$(date +%Y%m%d).png

# 2. Commit and push
git add docs/screenshots/
git commit -m "docs: add verification screenshot for issue #N"
git push

# 3. Reference in issue comment using raw URL
# Format: ![Alt Text](https://raw.githubusercontent.com/roni-ai-superapp/roni-ai-platform/main/docs/screenshots/issue-N-name-YYYYMMDD.png)
```

### Verification Comment Template

```markdown
## ✅ Issue #N Verified

### API Response
\`\`\`json
{...response data...}
\`\`\`

### Visual Verification
![Description](https://raw.githubusercontent.com/roni-ai-superapp/roni-ai-platform/main/docs/screenshots/issue-N-name.png)

### Checklist
- [x] Item 1
- [x] Item 2

cc @toddllm @germeeai
```

**Always tag @toddllm and @germeeai for human review.**

---

## 11) Session End Protocol

1. **Commit WIP**
   ```bash
   git add . && git commit -m "WIP: description"
   git push origin <branch>
   ```

2. **Update STATUS.md** (session log entry)

3. **Update AGENTS.md** (status = `idle` or `handoff`)

4. **Post issue comment** with current state

---

## 12) Status Values

| AGENTS.md Status | GitHub Label | Meaning |
|------------------|--------------|---------|
| `active` | `in-progress` | Working on it |
| `blocked` | `blocked` | Waiting on dependency |
| `pending-ci` | `pending-ci` | Waiting for CI |
| `ready-for-review` | `ready-for-review` | Awaiting human verification |
| `idle` | _(none)_ | Available for new work |
| `handoff` | _(none)_ | Passing to another agent |

---

## 13) Commit Message Format

```
<type>(<scope>): <description> (#issue)

Types: feat, fix, refactor, docs, test, chore
```

Examples:
```
feat(data-ingestion): add DDL generator (#6)
fix(platform-api): handle null cost in revenue calc (#7)
```

---

## 14) Agent Prompt Templates

See `CLAUDE.md` for copy-paste prompts:
- Creating new issues (no implementation)
- Claiming + implementing issues
- Investigation / spike (no code)
- Breaking down complex features (epic)

---

*Last Updated: 2025-12-25*
