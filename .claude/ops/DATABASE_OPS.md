# Database Operations

**Last Updated:** 2025-12-25

---

## Key Learnings & Recommendations

### Railway Auto-Rebuild Behavior

**Railway automatically rebuilds services when environment variables change.**

- No need to run `railway redeploy` after `railway variables --set`
- The rebuild happens within ~30-60 seconds
- Always verify via health endpoint SHA to confirm new deployment

### Health Endpoint Best Practices

The health endpoint should expose configuration state for debugging:

```json
{
  "status": "healthy",
  "service": "platform-api",
  "version": "0.1.0",
  "sha": "9a51f7c7...",           // Git SHA - confirms code version
  "uptime_ms": 30260,
  "timestamp": "2025-12-25T18:47:36.694Z",
  // Consider adding:
  "db_connected": true,          // Database connectivity
  "cors_origin": "https://..."   // Helps debug CORS issues
}
```

### CORS Configuration

**Always set `CORS_ORIGIN` on API services that serve frontends:**

```bash
railway variables --service platform-api --set 'CORS_ORIGIN=https://frontend-dev-5e53.up.railway.app,http://localhost:3000'
```

Without this, browser requests from frontend will fail with CORS errors even though curl works.

### Environment Variable Naming

**Use `NEXT_PUBLIC_` prefix for frontend env vars that need browser access:**

```bash
# These are available in browser JavaScript
NEXT_PUBLIC_API_URL=https://platform-api-dev-9a40.up.railway.app
NEXT_PUBLIC_ORG_ID=org1

# These are server-side only (NOT available in browser)
API_SECRET_KEY=...
```

---

## Database Architecture Recommendations

### Single Database per Environment

**Recommendation: One PostgreSQL instance per environment (dev, staging, prod).**

| Environment | Database Service | Services Connected |
|-------------|------------------|-------------------|
| dev | Postgres-OG9n | platform-api |
| staging | (TBD) | platform-api |
| prod | (TBD) | platform-api |

**Rationale:**
- Simpler to manage migrations
- Easier to debug (one place to look)
- Cost-effective (Railway charges per service)
- All application services share same data

### Naming Convention

```
Postgres-{ENV}-{RANDOM}
```

Examples:
- `Postgres-dev-OG9n` (current)
- `Postgres-staging-XXXX`
- `Postgres-prod-XXXX`

### Service-to-Database Linking

**Always use variable references, not hardcoded URLs:**

```bash
# CORRECT - uses Railway's internal reference
railway variables --set 'DATABASE_URL=${{Postgres-OG9n.DATABASE_URL}}'

# WRONG - hardcoded URL will break if database is recreated
railway variables --set 'DATABASE_URL=postgresql://postgres:password@host:5432/railway'
```

### Before Creating a New Database

1. **Check if one already exists** for the environment
2. **Document in this file** if creating new
3. **Link all services** that need database access
4. **Run migrations** before deploying application code

### Cleanup Protocol

When a database service is no longer needed:

1. **Verify no services reference it:**
   ```bash
   railway variables --service SERVICE_NAME | grep DATABASE_URL
   ```
2. **Backup data if needed** (use pg_dump)
3. **Delete via Dashboard** (CLI cannot delete services)
4. **Update this document** to remove the entry

---

## Current Status

### Railway PostgreSQL - DEV Environment

| Item | Value |
|------|-------|
| **Project** | platform |
| **Environment** | dev |
| **Database Service** | Postgres-OG9n |
| **Internal Host** | `postgres-og9n.railway.internal:5432` |
| **Public Host** | Get via `railway run --service Postgres-OG9n -- printenv DATABASE_PUBLIC_URL` |
| **Database Name** | railway |
| **User** | postgres |
| **Password** | Get from Railway Dashboard or CLI (never commit!) |

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

### Issue #6 (DDL Generator) - VERIFIED ✅

- [x] Migration applied
- [x] Tables created (clients, payers, reps, sales_report_entries)
- [x] View created (sales_report_view)
- [x] Test data inserted (3 payers, 2 clients, 2 reps, 3 sales entries)
- [x] View returns joined data with computed fields (revenue, commission, net)
- [x] Frontend displays data from Postgres
- [x] Screenshot posted to issue

### Issue #7 (Platform API DB) - VERIFIED ✅

- [x] Migration applied
- [x] Tables created (page_configs, tool_executions, audit_logs, view_whitelist)
- [x] Seed data inserted
- [x] API `/app-config/pages/sales-report` returns from DB
- [x] API `/app-config/data/sales_report_view` queries view
- [x] BigInt/Decimal/Date serialization working
- [x] CORS configured for frontend
- [x] Screenshot posted to issue

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
# Get credentials from Railway (never commit these!)
railway service link Postgres-OG9n
railway run --service Postgres-OG9n -- printenv DATABASE_PUBLIC_URL
# Copy the URL, extract host:port and password

# List all tables
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U postgres -d railway -c "\dt"

# List views
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U postgres -d railway -c "\dv"

# Check seed data
PGPASSWORD=$PASSWORD psql -h $HOST -p $PORT -U postgres -d railway -c "SELECT slug, title FROM page_configs;"

# Test API
curl -s https://platform-api-dev-9a40.up.railway.app/app-config/pages/sales-report | jq '.slug, .title'
```
