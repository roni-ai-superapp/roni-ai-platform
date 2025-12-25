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
| _example_ | roni-ai-superapp/roni-ai-platform | #6 | agent/example/issue-6-ddl-generator | active | 2025-12-26 12:00 UTC |

---

## Conventions

- **Agent:** Short identifier (e.g., "opus-1", "claude-code", "codex-ops")
- **Repo:** `roni-ai-superapp/<repo>` (monorepo or package repo)
- **Issues:** `#123`, `#124` (comma-separated, scoped to Repo)
- **Branch:** `agent/<name>/issue-###-slug`
- **Status:** `active`, `blocked`, `idle`, `handoff`, `ready-for-review`
- **ETA/Checkpoint:** Next planned update time (UTC)

---

## Status Values

| Status | Meaning |
|--------|---------|
| `active` | Currently working on the issue |
| `blocked` | Waiting on external dependency |
| `idle` | Available for new work |
| `handoff` | Passing work to another agent |
| `ready-for-review` | Code complete, awaiting human verification |
| `pending-ci` | Waiting for CI to complete |

---

## Claiming an Issue

```bash
# 1. Assign yourself
gh issue edit <number> --add-assignee @me --repo roni-ai-superapp/<repo>

# 2. Add in-progress label
gh issue edit <number> --add-label "in-progress" --repo roni-ai-superapp/<repo>

# 3. Comment with claim
gh issue comment <number> --repo roni-ai-superapp/<repo> --body "Claimed by <agent-name> until <YYYY-MM-DD>.
Repo: roni-ai-superapp/<repo>
Scope: <files/areas>
Branch: agent/<name>/issue-###-slug"

# 4. Update this file
```

---

## Releasing a Claim

When done or handing off:

1. Update this file (set status to `idle` or `handoff`)
2. Comment on the issue with current status
3. Remove `in-progress` label if appropriate

---

## Conflict Avoidance

- Do not modify files claimed by another agent
- If overlapping changes needed, coordinate in issue comments first
- Check this registry before claiming new work
