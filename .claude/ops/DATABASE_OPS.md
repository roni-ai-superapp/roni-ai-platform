# Database Operations

**Last Updated:** 2025-12-25

---

## Current Status

### Railway PostgreSQL - DEV Environment

| Item | Value |
|------|-------|
| **Project** | platform |
| **Environment** | dev |
| **Database Service** | Postgres-OG9n |
| **Internal URL** | `postgres-og9n.railway.internal:5432` |
| **Public URL** | `caboose.proxy.rlwy.net:55777` |
| **Database Name** | railway |
| **User** | postgres |

### Services Linked to Database

| Service | Variable | Reference |
|---------|----------|-----------|
| platform-api | `DATABASE_URL` | `${{Postgres-OG9n.DATABASE_URL}}` |

### Applied Migrations

| Migration | Description | Status |
|-----------|-------------|--------|
| `20251225123806_group_buying_sales_report` | Issue #6 - DDL tables + view | ✅ Applied |
| `20251225172757_platform_api_tables` | Issue #7 - Platform tables | ✅ Applied |

### Database Contents

**Tables (10):**
- `_prisma_migrations` - Prisma migration tracking
- `clients`, `payers`, `reps`, `payer_client_rep_assignments`, `sales_report_entries` - Issue #6 DDL
- `page_configs`, `tool_executions`, `audit_logs`, `view_whitelist` - Issue #7 Platform

**Views (1):**
- `sales_report_view` - Joins sales data for UI display

**Seed Data:**
- `page_configs`: 1 row (`sales-report`)
- `view_whitelist`: 1 row (`client1_sales_report` → `sales_report_view`)

---

## Verification Checklist

### Issue #6 (DDL Generator) - NEEDS VERIFICATION

- [x] Migration applied
- [x] Tables created (clients, payers, reps, etc.)
- [x] View created (sales_report_view)
- [ ] **Insert test data into tables**
- [ ] **Verify view returns joined data correctly**
- [ ] **Test from frontend UI**

### Issue #7 (Platform API DB) - VERIFIED ✅

- [x] Migration applied
- [x] Tables created (page_configs, tool_executions, audit_logs, view_whitelist)
- [x] Seed data inserted
- [x] API `/app-config/pages/sales-report` returns from DB
- [x] API `/app-config/data/sales_report_view` queries view

---

## Setup Process (For New Environments)

### 1. Create Postgres Service

```bash
# Via Dashboard (recommended):
# Railway Dashboard → Project → + New → Database → PostgreSQL

# Service will be named like "Postgres-XXXX"
```

### 2. Link Service to App

```bash
# Link CLI to your app service
railway service link platform-api

# Set DATABASE_URL as reference to Postgres service
railway variables --set 'DATABASE_URL=${{Postgres-XXXX.DATABASE_URL}}'

# Verify the reference resolved
railway run --service platform-api -- printenv DATABASE_URL
```

### 3. Run Migrations

```bash
# Get public URL for external access
railway service link Postgres-XXXX
railway run --service Postgres-XXXX -- printenv DATABASE_PUBLIC_URL

# Run migrations using public URL
cd packages/platform-api
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway" npx prisma migrate deploy
```

### 4. Seed Database

```bash
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway" pnpm db:seed
```

### 5. Verify

```bash
# Test API endpoint
curl https://YOUR-APP.up.railway.app/app-config/pages/sales-report

# Direct DB query
PGPASSWORD=PASSWORD psql -h HOST -p PORT -U postgres -d railway -c "\dt"
```

---

## Railway CLI Reference

### Linking Services

```bash
# Link CLI to a service (required before most commands)
railway service link <service-name>

# Check current link
railway status
```

### Variables

```bash
# View variables for linked service
railway variables

# Set a variable
railway variables --set 'KEY=value'

# Set variable as reference to another service
railway variables --set 'DATABASE_URL=${{Postgres-OG9n.DATABASE_URL}}'

# Get resolved variable value
railway run --service <service> -- printenv KEY
```

### Running Commands with Railway Env

```bash
# IMPORTANT: Must specify --service for vars to inject
railway run --service platform-api -- npx prisma migrate status

# Without --service, uses local env only (won't have Railway vars)
```

### CLI Limitations

**No service deletion via CLI.** Must use Dashboard:
1. Railway Dashboard → Project
2. Click service → Settings → Danger Zone → Delete Service

Available commands:
- `railway add` - Add new service
- `railway service link` - Link to service
- `railway service status` - Check deployment status
- `railway down` - Remove most recent deployment (NOT the service)
- `railway variables` - View/set variables

---

## Prisma Commands

Run from `packages/platform-api`:

```bash
# Generate client (after schema changes)
pnpm db:generate

# Create migration (dev only)
DATABASE_URL="..." npx prisma migrate dev --name "description"

# Apply migrations (prod-safe)
DATABASE_URL="..." npx prisma migrate deploy

# Check migration status
DATABASE_URL="..." npx prisma migrate status

# Seed database
DATABASE_URL="..." pnpm db:seed

# Open Studio GUI
DATABASE_URL="..." pnpm db:studio
```

### Migration Gotchas

1. **Local .env overrides Railway vars** - Prisma loads `.env` first. Either:
   - Use explicit `DATABASE_URL="..."` prefix
   - Temporarily rename `.env`

2. **Prisma tries to DROP tables not in schema** - If DDL created tables outside Prisma, edit migration to remove DROP statements before applying.

3. **Internal vs Public URL** - Use public URL (`DATABASE_PUBLIC_URL`) for local/CI access. Internal URL only works within Railway.

---

## Troubleshooting

### "Can't reach database server"

1. Use `DATABASE_PUBLIC_URL` for external connections
2. Check Railway service is running (Dashboard → service → Deployments)
3. Verify port is correct (public URL has different port than 5432)

### "Environment variable not found: DATABASE_URL"

```bash
# railway run without --service doesn't inject vars
# WRONG:
railway run -- npx prisma migrate deploy

# RIGHT:
railway run --service platform-api -- npx prisma migrate deploy

# OR use explicit URL:
DATABASE_URL="..." npx prisma migrate deploy
```

### "Migration failed" / Conflicts

```bash
# Check current status
DATABASE_URL="..." npx prisma migrate status

# Mark migration as applied without running (if already applied manually)
DATABASE_URL="..." npx prisma migrate resolve --applied "MIGRATION_NAME"

# Reset database (DESTROYS ALL DATA)
DATABASE_URL="..." npx prisma migrate reset
```

---

## Quick Verification Commands

```bash
# Set public URL for convenience
export DATABASE_URL="postgresql://postgres:UFsxYOQCPdTExjbmAywxocNZnYSUspFo@caboose.proxy.rlwy.net:55777/railway"

# List all tables
PGPASSWORD=UFsxYOQCPdTExjbmAywxocNZnYSUspFo psql -h caboose.proxy.rlwy.net -p 55777 -U postgres -d railway -c "\dt"

# List views
PGPASSWORD=UFsxYOQCPdTExjbmAywxocNZnYSUspFo psql -h caboose.proxy.rlwy.net -p 55777 -U postgres -d railway -c "\dv"

# Check seed data
PGPASSWORD=UFsxYOQCPdTExjbmAywxocNZnYSUspFo psql -h caboose.proxy.rlwy.net -p 55777 -U postgres -d railway -c "SELECT slug, title FROM page_configs;"

# Test API
curl -s https://platform-api-dev-9a40.up.railway.app/app-config/pages/sales-report | jq '.slug, .title'
```
