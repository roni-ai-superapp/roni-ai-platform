# Database Operations

**Last Updated:** 2025-12-25

---

## Architecture Decision

### Single Postgres per Environment

**Decision:** One Postgres service per environment (dev, staging, prod). All services in that environment share the same database.

| Environment | DB Service | Connected Services |
|-------------|------------|-------------------|
| dev | `Postgres-OG9n` | platform-api |
| staging | (TBD) | platform-api |
| prod | (TBD) | platform-api |

**Rationale:**
- Simpler migration management
- Cost-effective (one DB service)
- Easier debugging (one place to look)
- Schemas provide logical isolation when needed

### Schema Isolation Strategy

Use Postgres schemas for logical separation within the single database:

| Schema | Purpose | Owner |
|--------|---------|-------|
| `public` | Default, platform tables (current) | postgres |
| `plaid` | Plaid integration tables (future) | postgres |
| `org_<id>` | Per-org isolation (future, if needed) | postgres |

**Current state:** All tables in `public` schema. Migrate to named schemas when isolation is needed.

### MarketLink Separation

**MarketLink stays in its own Railway project.** Integration is via HTTP APIs, not shared database. This provides hard isolation for the legacy system.

---

## Service → Database Mapping

### DEV Environment

| Service | DATABASE_URL Reference | Schema | Status |
|---------|------------------------|--------|--------|
| platform-api | `${{Postgres-OG9n.DATABASE_URL}}` | public | ✅ Connected |
| frontend | N/A (calls API) | - | ✅ Working |
| plaid-frontend | None | - | ⚠️ Unconfigured |

### Tables in public Schema

```
_prisma_migrations, audit_logs, clients, page_configs,
payer_client_rep_assignments, payers, reps, sales_report_entries,
tool_executions, view_whitelist
```

### Views

```
sales_report_view
```

---

## Naming Convention

### Database Services

```
Postgres-{env}-{random}  →  platform-db  (future standard)
```

**Current:** `Postgres-OG9n` (Railway auto-generated name)
**Target:** Rename to `platform-db` when convenient (requires updating all `${{...}}` refs)

### Variable References

Always use Railway cross-service references, never hardcoded URLs:

```bash
# CORRECT - survives password rotation, internal routing
DATABASE_URL=${{Postgres-OG9n.DATABASE_URL}}

# WRONG - breaks if password/host changes
DATABASE_URL=postgresql://postgres:xxx@host:5432/railway
```

**Warning:** Renaming a Postgres service breaks all `${{ServiceName.VAR}}` refs. Update all services after rename.

---

## Connecting to the Database

### From Railway Dashboard

1. Go to Postgres service → **Connect** tab
2. Copy connection string or use web psql

### From Local Machine (Recommended)

Use the **public URL** (external access):

```bash
# Get credentials (one-time, don't commit)
# Dashboard → Postgres-OG9n → Variables → DATABASE_PUBLIC_URL

# Connect with psql
PGPASSWORD=<password> psql -h caboose.proxy.rlwy.net -p 55777 -U postgres -d railway
```

### From Railway CLI

```bash
# Interactive psql session (requires TTY)
railway connect Postgres-OG9n

# Run a command with Railway vars injected (LOCAL execution)
# NOTE: This runs on YOUR machine, so internal URLs won't resolve
railway run --service platform-api -- echo $DATABASE_URL
```

**Important:** `railway run` injects variables but runs locally. Use public URL for actual DB connections from your machine.

### Useful psql Commands

```sql
\l          -- list databases
\dn         -- list schemas
\dt         -- list tables in current schema
\dt *.*     -- list all tables in all schemas
\d tablename -- describe table
```

---

## Migrations

### Running Migrations

From `packages/platform-api`:

```bash
# Using public URL (from local machine)
DATABASE_URL="postgresql://postgres:PASSWORD@caboose.proxy.rlwy.net:55777/railway" \
  npx prisma migrate deploy

# Check status
DATABASE_URL="..." npx prisma migrate status
```

### Applied Migrations

| Migration | Description | Date |
|-----------|-------------|------|
| `20251225123806_group_buying_sales_report` | Issue #6 - DDL tables + view | 2025-12-25 |
| `20251225172757_platform_api_tables` | Issue #7 - Platform tables | 2025-12-25 |

### Migration Gotchas

1. **Local .env overrides Railway vars** - Use explicit `DATABASE_URL="..."` prefix
2. **Internal vs Public URL** - Use `DATABASE_PUBLIC_URL` for external access
3. **Prisma tries to DROP tables not in schema** - Review migration SQL before applying

---

## Backup & Restore

### Manual Backup (pg_dump)

```bash
# Set credentials
export PGHOST=caboose.proxy.rlwy.net
export PGPORT=55777
export PGUSER=postgres
export PGPASSWORD=<password>
export PGDATABASE=railway

# Full backup
pg_dump -Fc > backup_$(date +%Y%m%d_%H%M%S).dump

# Schema only (for structure comparison)
pg_dump --schema-only > schema.sql
```

### Restore

```bash
# Restore to same or different database
pg_restore -d railway backup_20251225.dump

# Or for SQL dumps
psql -d railway < schema.sql
```

### Railway Snapshots

Railway provides automatic snapshots for Pro plans. Check Dashboard → Postgres service → Backups.

Reference: [Railway Postgres Backup Guide](https://blog.railway.com/p/postgre-backup)

---

## Troubleshooting

### "Can't reach database server"

1. **Using internal URL from local machine** - Use `DATABASE_PUBLIC_URL` instead
2. **Service not running** - Check Railway Dashboard
3. **Wrong port** - Public URL uses different port than 5432

### "Environment variable not found: DATABASE_URL"

```bash
# railway run without --service doesn't inject vars
# WRONG:
railway run -- npx prisma migrate deploy

# RIGHT (but still runs locally):
railway run --service platform-api -- echo $DATABASE_URL

# BEST (use public URL explicitly):
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Cross-Service Variable Refs Not Working

- Verify exact service name spelling (case-sensitive)
- After renaming a service, update ALL `${{OldName.VAR}}` refs
- PR environments may have issues with cross-service refs

---

## Cleanup Protocol

Before deleting a Postgres service:

1. **Verify no services reference it:**
   ```bash
   railway variables --service SERVICE_NAME | grep DATABASE
   ```

2. **Backup data:**
   ```bash
   pg_dump -Fc > backup_before_delete.dump
   ```

3. **Delete via Dashboard** (CLI cannot delete services):
   Dashboard → Service → Settings → Danger Zone → Delete

4. **Update this document**

---

## Quick Reference

### Current Credentials (DEV)

| Item | Value |
|------|-------|
| Service | Postgres-OG9n |
| Host (public) | caboose.proxy.rlwy.net |
| Port (public) | 55777 |
| Host (internal) | postgres-og9n.railway.internal |
| Port (internal) | 5432 |
| Database | railway |
| User | postgres |
| Password | (see Railway Dashboard) |

### API Endpoints

```bash
# Health check
curl https://platform-api-dev-9a40.up.railway.app/health

# Page config (DB-backed)
curl https://platform-api-dev-9a40.up.railway.app/app-config/pages/sales-report

# View data (DB-backed)
curl https://platform-api-dev-9a40.up.railway.app/app-config/data/sales_report_view
```

---

## Future Actions

- [ ] Decide on `plaid-frontend`: configure or delete
- [ ] Rename `Postgres-OG9n` → `platform-db` (update all refs)
- [ ] Create `plaid` schema when plaid-api is added
- [ ] Set up staging environment with its own Postgres
- [ ] Document prod backup/restore drill
