# Database Operations

**Last Updated:** 2025-12-25

---

## Railway PostgreSQL

The platform uses Railway-hosted PostgreSQL for all environments.

### Connection Info

| Environment | Project | Service |
|-------------|---------|---------|
| dev | platform | Postgres (to be added) |
| production | platform | Postgres (to be added) |

### Adding Postgres to Railway

1. Go to Railway Dashboard → Project
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway auto-provisions and sets `DATABASE_URL` for linked services

### Getting the Public URL

For local development or migrations from outside Railway:

```bash
# Via Railway CLI (requires interactive mode)
railway variables --service Postgres

# Look for:
# - DATABASE_URL (internal, for Railway services)
# - DATABASE_PUBLIC_URL (external, for local dev)
```

Or via Dashboard:
1. Click the Postgres service
2. Go to **Variables** tab
3. Copy `DATABASE_PUBLIC_URL`

---

## Prisma Commands

Run from `packages/platform-api`:

```bash
# Generate Prisma client (after schema changes)
pnpm db:generate

# Create and apply migrations (dev)
pnpm db:migrate

# Push schema without migration (quick sync)
pnpm db:push

# Seed database
pnpm db:seed

# Open Prisma Studio (GUI)
pnpm db:studio
```

### Applying Migrations to Railway

```bash
# Option 1: Via Railway CLI
railway run --service platform-api -- npx prisma migrate deploy

# Option 2: Set DATABASE_PUBLIC_URL locally
export DATABASE_URL="postgresql://user:pass@host:port/db"
npx prisma migrate deploy
```

---

## Issue #6 DDL Migration

The DDL Generator (issue #6) creates:
- `client1_sales_report` table
- `sales_report_view` view

Migration file: `prisma/migrations/20251225123806_group_buying_sales_report/`

### Verifying Migration Applied

```sql
-- Check table exists
SELECT * FROM client1_sales_report LIMIT 1;

-- Check view exists
SELECT * FROM sales_report_view LIMIT 1;

-- List all tables/views
\dt
\dv
```

---

## Issue #7 Platform Tables

Prisma manages these platform tables:
- `page_configs` - UI page configurations
- `tool_executions` - Tool gateway idempotency
- `audit_logs` - Audit trail
- `view_whitelist` - Safe dynamic query mapping

### Seeding Platform Data

```bash
pnpm db:seed
```

Seeds:
- `sales-report` PageConfig
- `client1_sales_report` → `sales_report_view` whitelist entry

---

## Troubleshooting

### "Can't reach database server"

1. Check Railway Postgres is running
2. Use `DATABASE_PUBLIC_URL` for external connections
3. Check firewall/network access

### "Migration failed"

```bash
# Check migration status
npx prisma migrate status

# Reset if needed (DESTROYS DATA)
npx prisma migrate reset
```

### "Table already exists"

If DDL migration conflicts with Prisma:
```bash
# Mark migration as applied without running
npx prisma migrate resolve --applied "20251225123806_group_buying_sales_report"
```

---

## Environment Variables

| Variable | Description | Where Set |
|----------|-------------|-----------|
| `DATABASE_URL` | Postgres connection string | Railway auto-set |
| `DATABASE_PUBLIC_URL` | External connection | Railway auto-set |

For local `.env`:
```
DATABASE_URL="postgresql://user:pass@host:port/db"
```

---

## Quick Reference

```bash
# Check what's in the database
railway run --service platform-api -- npx prisma db pull

# Generate migration from schema diff
npx prisma migrate dev --name "description"

# Apply pending migrations
npx prisma migrate deploy
```
