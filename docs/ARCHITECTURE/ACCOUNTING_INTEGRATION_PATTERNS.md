# Accounting Integration Patterns: Monolith vs Microservices

This document captures architectural patterns learned from implementing accounting-db integration in both the monolith (MarketLink/roniai-demo) and microservices (roni-ai-platform) architectures.

## Overview

| Aspect | Monolith (MarketLink) | Microservices (Platform) |
|--------|----------------------|--------------------------|
| **Repo** | `roni-ai/roniai-demo` | `roni-ai-superapp/roni-ai-platform` |
| **Frontend** | Next.js (same repo) | Next.js (submodule: repo-frontend) |
| **API** | tRPC + Next.js API routes | Fastify (submodule: repo-platform-api) |
| **Accounting Client** | Direct in tRPC routers | Dedicated gateway in platform-api |
| **DB Access** | Prisma (shared db) | Prisma (own db) + HTTP to accounting-db |
| **Deploy** | Single Railway service | Multiple Railway services |

---

## 1. Monolith Pattern (MarketLink)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     roniai-demo                              │
├─────────────────────────────────────────────────────────────┤
│  Next.js App                                                 │
│  ├── pages/                                                  │
│  │   ├── reports/trial-balance.tsx                          │
│  │   ├── reports/balance-sheet.tsx                          │
│  │   └── ...                                                 │
│  ├── src/server/                                             │
│  │   ├── routers/accounting.ts    ← tRPC router             │
│  │   └── lib/accounting/          ← Client + helpers        │
│  │       ├── AccountingDbClient.ts                          │
│  │       ├── outbox.ts            ← Event outbox            │
│  │       └── types.ts                                        │
│  └── prisma/                                                 │
│      └── schema.prisma            ← Shared db schema        │
├─────────────────────────────────────────────────────────────┤
│                 MarketLink PostgreSQL                        │
│  ├── Business tables (Project, Deal, etc.)                  │
│  └── accounting_outbox table      ← For async events        │
└─────────────────────────────────────────────────────────────┘
          │
          │ HTTP (Bearer token)
          ▼
┌─────────────────────────────────────────────────────────────┐
│              accounting-db-service                           │
│  ├── /v1/orgs/{orgId}/source-events    ← Ingest events     │
│  ├── /v1/orgs/{orgId}/journal-entries  ← Query entries     │
│  ├── /v1/orgs/{orgId}/reports/*        ← Financial reports │
│  └── /v1/orgs/{orgId}/org-accounts     ← Chart of accounts │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns

#### 1.1 tRPC Router for Accounting

```typescript
// src/server/routers/accounting.ts
export const accountingRouter = router({
  getTrialBalance: protectedProcedure
    .input(z.object({ asOfDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const client = getAccountingClient(ctx.orgId);
      return client.getTrialBalance(input.asOfDate);
    }),

  // Event ingestion (for business events that need journal entries)
  ingestEvent: protectedProcedure
    .input(sourceEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Option A: Direct call
      const client = getAccountingClient(ctx.orgId);
      return client.ingestSourceEvent(input);

      // Option B: Outbox pattern (preferred for reliability)
      await ctx.prisma.accounting_outbox.create({
        data: { event_type: input.type, payload: input, status: 'pending' }
      });
    }),
});
```

#### 1.2 Outbox Pattern for Reliable Event Delivery

```typescript
// src/lib/accounting/outbox.ts
export async function drainOutbox(batchSize = 10) {
  const events = await prisma.accounting_outbox.findMany({
    where: { status: 'pending' },
    orderBy: { created_at: 'asc' },
    take: batchSize,
  });

  for (const event of events) {
    try {
      await client.ingestSourceEvent(event.payload);
      await prisma.accounting_outbox.update({
        where: { id: event.id },
        data: { status: 'sent', sent_at: new Date() },
      });
    } catch (err) {
      await prisma.accounting_outbox.update({
        where: { id: event.id },
        data: { status: 'failed', error: String(err), retry_count: { increment: 1 } },
      });
    }
  }
}
```

#### 1.3 Role-Gated Access

```typescript
// src/lib/auth/permissions.ts
export function canAccessAccounting(user: SessionUser): boolean {
  return (
    user.status === UserStatus.active &&
    ['admin', 'finance', 'accountant'].includes(user.role)
  );
}

// In sidebar component
{canAccessAccounting(user) && (
  <SidebarSection title="Accounting">
    <SidebarLink href="/reports/trial-balance">Trial Balance</SidebarLink>
    ...
  </SidebarSection>
)}
```

### Pros

- **Simpler deployment**: Single service, single Railway project
- **Shared session/auth**: User context flows naturally through tRPC
- **Direct DB access**: Can join accounting data with business data easily
- **Faster iteration**: No cross-repo coordination needed

### Cons

- **Tight coupling**: Accounting code lives with business code
- **Harder to scale**: Can't scale accounting separately
- **Migration complexity**: Hard to extract later
- **Test isolation**: Database state bleeds across tests

---

## 2. Microservices Pattern (Platform)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   roni-ai-platform (monorepo)               │
├─────────────────────────────────────────────────────────────┤
│  packages/frontend (submodule: repo-frontend)               │
│  ├── src/pages/reports/                                     │
│  │   ├── trial-balance.tsx                                  │
│  │   └── ...                                                │
│  └── src/lib/platform-api.ts      ← HTTP client            │
├─────────────────────────────────────────────────────────────┤
│  packages/platform-api (submodule: repo-platform-api)       │
│  ├── src/routes/accounting.ts     ← Fastify routes         │
│  └── src/lib/accounting-db-client.ts                        │
├─────────────────────────────────────────────────────────────┤
│  packages/shared-contracts        ← Shared types            │
└─────────────────────────────────────────────────────────────┘
          │
          │ HTTP (internal)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    platform-api                              │
│  ├── GET /accounting/diagnostics                             │
│  ├── GET /accounting/accounts                                │
│  ├── GET /accounting/reports/trial-balance                   │
│  ├── GET /accounting/reports/balance-sheet                   │
│  ├── GET /accounting/reports/income-statement                │
│  ├── GET /accounting/reports/cash-flow-statement             │
│  └── GET /accounting/journal-entries                         │
└─────────────────────────────────────────────────────────────┘
          │
          │ HTTP (Bearer token)
          ▼
┌─────────────────────────────────────────────────────────────┐
│              accounting-db-service                           │
│  (same as monolith)                                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns

#### 2.1 Gateway Pattern (platform-api as accounting gateway)

```typescript
// packages/platform-api/src/lib/accounting-db-client.ts
export class AccountingDbClient {
  constructor(private config: AccountingDbConfig) {}

  private async fetch<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceResponse> {
    const date = asOfDate || new Date().toISOString().split('T')[0];
    return this.fetch(`/v1/orgs/${this.config.orgId}/reports/trial-balance?as_of_date=${date}`);
  }

  async runDiagnostics(): Promise<DiagnosticsResult> {
    // Comprehensive health check
    const result = { status: 'pass', checks: {} };
    // Check env, health, auth, accounts, trial_balance
    return result;
  }
}
```

#### 2.2 Fastify Route Layer

```typescript
// packages/platform-api/src/routes/accounting.ts
export async function accountingRoutes(fastify: FastifyInstance) {
  fastify.get('/diagnostics', async (request, reply) => {
    const client = getAccountingDbClient();
    if (!client) {
      return reply.send({ status: 'fail', message: 'Not configured' });
    }
    return client.runDiagnostics();
  });

  fastify.get('/reports/trial-balance', async (request, reply) => {
    const client = getAccountingDbClient();
    if (!client) {
      return reply.status(503).send({ error: { code: 'NOT_CONFIGURED' } });
    }
    return client.getTrialBalance(request.query.as_of_date);
  });
}
```

#### 2.3 Frontend API Client

```typescript
// packages/frontend/src/lib/platform-api.ts
const API_BASE = process.env.NEXT_PUBLIC_PLATFORM_API_URL;

export async function getAccountingDiagnostics() {
  const res = await fetch(`${API_BASE}/accounting/diagnostics`);
  return res.json();
}

export async function getTrialBalance(asOfDate?: string) {
  const params = asOfDate ? `?as_of_date=${asOfDate}` : '';
  const res = await fetch(`${API_BASE}/accounting/reports/trial-balance${params}`);
  return res.json();
}
```

#### 2.4 Submodule Two-PR Rule

```bash
# 1. Make changes in submodule
cd packages/platform-api
git checkout -b feat/accounting-routes
git commit -m "feat: add accounting routes"
git push origin feat/accounting-routes

# 2. Create PR in submodule repo
gh pr create --repo roni-ai-superapp/repo-platform-api

# 3. After merge, bump parent
cd ../..
git add packages/platform-api
git commit -m "chore: bump platform-api submodule"
git push
```

### Pros

- **Clear boundaries**: Accounting is a separate concern
- **Independent scaling**: Can scale platform-api separately
- **Team autonomy**: Different teams can own different services
- **Easier testing**: Services can be mocked/stubbed independently
- **Gateway benefits**: Central place for auth, rate limiting, caching

### Cons

- **More infrastructure**: Multiple Railway services to manage
- **Coordination overhead**: Submodule workflow is more complex
- **Latency**: Additional network hop (frontend → platform-api → accounting-db)
- **Distributed debugging**: Harder to trace issues across services

---

## 3. Shared Patterns (Both Architectures)

### 3.1 API Key Format

```
ak_{orgId}.{apiKeyId}.{secret}

Components:
- ak_ prefix (fixed)
- orgId: UUID of the organization
- apiKeyId: UUID of the API key record
- secret: 32-byte random value (base64url encoded)
```

### 3.2 Environment Variables

| Variable | Description |
|----------|-------------|
| `ACCOUNTING_DB_API_BASE_URL` | Base URL to accounting-db service |
| `ACCOUNTING_DB_API_KEY` | Bearer token (ak_... format) |
| `ACCOUNTING_DB_ORG_ID` | Default org UUID |

### 3.3 Diagnostics Endpoint Pattern

Every accounting integration should have a `/diagnostics` endpoint that checks:

1. **Environment**: All required env vars set
2. **Health**: accounting-db service is reachable
3. **Auth**: API key is valid
4. **Data**: Org has accounts, can fetch reports

```json
{
  "status": "pass",
  "checks": {
    "env": { "status": "pass", "message": "All environment variables set" },
    "health": { "status": "pass", "message": "Service healthy", "latency_ms": 200 },
    "auth": { "status": "pass", "message": "Authentication successful" },
    "accounts": { "status": "pass", "message": "Found 14 accounts", "count": 14 },
    "trial_balance": { "status": "pass", "message": "Trial balance retrieved" }
  },
  "timestamp": "2025-12-27T01:34:42.725Z"
}
```

### 3.4 Report Date Defaults

| Report | Default Date(s) |
|--------|-----------------|
| Trial Balance (Adjusted) | End of current month |
| Trial Balance (Unadjusted) | End of current month |
| Balance Sheet | End of current month |
| Income Statement | Current month (start → end) |
| Cash Flow Statement | Current month (start → end) |

### 3.5 Journal Entry Lifecycle

```
Source Event → DRAFT Entry → POSTED Entry → Affects Reports
                    │
                    └── Can be VOIDED
```

Only POSTED entries affect Trial Balance and other reports.

---

## 4. Security Patterns

### 4.1 API Key Management

```
NEVER:
- Paste keys in GitHub issues, PRs, or chat
- Commit keys to git (even in .env files)
- Log keys in application logs

ALWAYS:
- Store keys in Railway Variables or AWS Secrets Manager
- Use .env.local (gitignored) for local development
- Rotate keys immediately if exposed
- Document key format and rotation procedure
```

### 4.2 Railway Private Network

```
DON'T: Use postgres.railway.internal from local machine
DO: Use public domains for cross-service calls
DO: Use railway connect for local DB access
```

---

## 5. Testing Patterns

### 5.1 Layered Seeding

| Layer | What | How |
|-------|------|-----|
| Layer A | MarketLink DB → Outbox | Prisma, runs inside Railway |
| Layer B | Direct API to accounting-db | HTTP, works locally |

For test org setup, Layer B is preferred because it works without Railway DB access.

### 5.2 E2E Configuration

```typescript
// playwright.config.ts
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  use: { baseURL },
});
```

Run locally:
```bash
pnpm test:e2e
```

Run against Railway DEV:
```bash
E2E_BASE_URL=https://platform-frontend-dev.up.railway.app pnpm test:e2e
```

---

## 6. Decision Matrix

Use this to decide which pattern fits your situation:

| Factor | Choose Monolith | Choose Microservices |
|--------|-----------------|---------------------|
| Team size | < 5 developers | > 5 developers |
| Deploy frequency | Same cadence for all features | Different cadences per service |
| Scaling needs | Uniform load | Spiky accounting load |
| Time to market | Faster initial delivery | Slower initial, faster long-term |
| Complexity budget | Limited infra expertise | Dedicated platform team |
| Data locality | Tight business + accounting joins | Loose coupling acceptable |

---

## 7. Migration Path: Monolith → Microservices

If starting with monolith and later extracting:

1. **Extract client first**: Move AccountingDbClient to shared package
2. **Add gateway layer**: Create platform-api accounting routes that mirror tRPC
3. **Dual-write period**: Frontend calls both, compare results
4. **Cut over**: Point frontend to platform-api exclusively
5. **Remove legacy**: Delete tRPC accounting router

---

## Related Documents

- [TEST_ORG_SETUP.md](../runbooks/TEST_ORG_SETUP.md) - Test org setup runbook
- [API_KEY_MANAGEMENT.md](../../accounting-db-service/docs/API_KEY_MANAGEMENT.md) - API key documentation
- [ACCOUNTING_DB_PATTERNS.md](./ACCOUNTING_DB_PATTERNS.md) - Integration patterns detail

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-27 | Initial documentation of monolith vs microservices patterns | Claude Code |
