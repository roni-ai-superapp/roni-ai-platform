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
| claude-opus | roni-ai-superapp/roni-ai-platform | #6 | agent/opus/issue-6-ddl-generator | ready-for-review | Implementation complete, awaiting human review |

**Submodule branches for #6:**
- `packages/shared-contracts`: `agent/opus/issue-6-esm-fixes`
- `packages/data-ingestion`: `agent/opus/issue-6-ddl-generator`
- `packages/platform-api`: `agent/opus/issue-6-migration`

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
