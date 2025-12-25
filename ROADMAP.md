# Roni AI Platform Roadmap

## Vertical Slice Priority

We build vertically, not horizontally. Each feature goes prompt → schema → table → view → page → statements.

**Golden Path**: Client 1 Sales Report (Group Buying vertical)

---

## Day 1 Status: COMPLETE

### shared-contracts ✅
- [x] DataModelSpec schema with auto-lookup, computed fields
- [x] PreviewPlan schema for Tool Gateway confirmation
- [x] PageConfig / BoxSpec schemas
- [x] Money module (minor units, HALF_UP rounding, percent 0-100)
- [x] Fixtures: client1_sales_report.json, client1_sales_report_page.json
- [x] JSON Schema generation from Zod (build:schemas)
- [x] Business rules documentation

### platform-api ✅
- [x] Fastify server scaffold
- [x] Tool Gateway with Ajv validation
- [x] Confirmation flow with preview/confirm tokens
- [x] Idempotency (in-memory for Day 1)
- [x] Audit logging
- [x] GET /app-config/pages/:slug
- [x] GET /app-config/data/:view (with pagination, sorting)
- [x] GET /app-config/lookup/:table
- [x] Health endpoints

### frontend ✅
- [x] Next.js 14 + TypeScript + Tailwind
- [x] API client with org context injection
- [x] PageRenderer - config-driven rendering
- [x] BoxRegistry - extensible box types
- [x] TableBox - pagination, sorting, aggregations
- [x] AddRowModal, ConfirmDialog, ToolConfirmModal
- [x] Money/percent/date formatters

---

## Day 2-3: Data Layer

### data-ingestion 🔲
- [ ] DataModelSpec parser
- [ ] PostgreSQL DDL generator
- [ ] View generator with computed columns
- [ ] Auto-lookup resolution
- [ ] Migration file output

### Platform API Database 🔲
- [ ] Prisma schema for PageConfig, BoxSpec
- [ ] Prisma schema for audit_log
- [ ] Database migrations
- [ ] Replace in-memory fixtures with DB queries

---

## Day 3-4: Agent Runtime

### agent-runtime 🔲
- [ ] Tool registry (data.insert_row, data.update_row, data.delete_row)
- [ ] Tool executor with validation
- [ ] Context injection (org_id, user_id, screen_context)
- [ ] Permission checks
- [ ] Rate limiting

### worker 🔲
- [ ] Job queue (BullMQ or similar)
- [ ] Posting job processor
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue

---

## Day 4-5: Accounting

### accounting-core 🔲
- [ ] Journal entry schema
- [ ] Journal generation from DataModelSpec.accounting_config
- [ ] Posting engine
- [ ] Trial balance generation
- [ ] P&L and Balance Sheet views

---

## Week 2: Migrations

### plaid service 🔄
- [ ] Adapt to shared-contracts types
- [ ] Emit events to platform message bus
- [ ] Add Tool Gateway integration
- Status: ~80% complete, needs adaptation

### stripe service 🔄
- [ ] Adapt to shared-contracts types
- [ ] Add reconciliation to accounting-core
- [ ] Add Tool Gateway integration
- Status: ~75% complete, needs adaptation

### accounting-db service 🔄
- [ ] Migrate logic to accounting-core
- [ ] Deprecate old service
- Status: ~80% complete, logic extraction needed

---

## Milestone Definitions

### M1: Platform Foundation
- shared-contracts with all schemas
- platform-api with Tool Gateway
- frontend with PageRenderer
- One page renders correctly (sales-report)

### M2: Data + Agent
- DataModelSpec → DDL working
- Agent can execute tools
- CRUD operations work end-to-end

### M3: Accounting
- Journal generation working
- Posting runs successfully
- TB/P&L/BS generated

### M4: Connectors
- Plaid adapted and integrated
- Stripe adapted and integrated
- Real bank data flowing

### M5: Production
- Multi-tenant auth
- RBAC permissions
- Deployment pipeline
- Monitoring and alerting

---

## Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema source | Zod → JSON Schema | Type safety + runtime validation |
| Percent storage | 0-100 (not 0-1) | Human readable, matches UI |
| Money storage | Minor units (cents) | Avoid floating point errors |
| Rounding | HALF_UP | Industry standard |
| Commission precedence | Assignment → Rep → 0 | Most specific wins |
| Org context (v1) | Env variable | Simplify Day 1, add auth later |
| API validation | Ajv + JSON Schema | Fast, standard, generated |

---

## Issue Tracking

Issues are tracked at two levels:
1. **Monorepo issues**: Cross-cutting concerns, integration, milestones
2. **Package issues**: Implementation details within each package

See GitHub Issues for current status.
