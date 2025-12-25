# Roni AI Platform

AI-first, config-driven finance platform for multi-tenant SaaS.

## Quick Start

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/roni-ai-superapp/roni-ai-platform.git
cd roni-ai-platform

# Or if already cloned
git submodule update --init --recursive

# Install dependencies (from root)
pnpm install

# Start development
pnpm dev
```

## Repository Structure

```
roni-ai-platform/
├── packages/                    # Core platform packages
│   ├── shared-contracts/        # Zod schemas, types, fixtures
│   ├── platform-api/            # Fastify API, Tool Gateway
│   ├── frontend/                # Next.js UI, PageRenderer
│   ├── agent-runtime/           # AI agent execution engine
│   ├── worker/                  # Background jobs, posting
│   ├── data-ingestion/          # DataModelSpec → DDL/views
│   ├── accounting-core/         # Ledger, statements
│   └── packs/                   # Content packs, templates
├── services/                    # Existing services (migrate)
│   ├── plaid/                   # Plaid connector (~80% done)
│   ├── stripe/                  # Stripe connector (~75% done)
│   ├── plaid-frontend/          # Plaid UI
│   └── accounting-db/           # Accounting DB service (~80% done)
├── infra/                       # Infrastructure as Code
├── docs/                        # Architecture, guides
└── .claude/                     # Agent context and guidance
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ PageRenderer │ │  BoxRegistry │ │ TableBox / FormDrawer    │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Platform API (Fastify)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Tool Gateway │ │  App Config  │ │ Auth / Permissions       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Agent Runtime  │ │ Data Ingestion │ │   Accounting   │
│ (AI Tools)     │ │ (DDL/Views)    │ │   (Posting)    │
└────────────────┘ └────────────────┘ └────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │  PostgreSQL  │ │    Prisma    │ │ Connectors (Plaid/Stripe)│ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Current Status (Day 1 Complete)

### Done
- [x] **shared-contracts**: Zod schemas, DataModelSpec, PreviewPlan, fixtures
- [x] **platform-api**: Tool Gateway with Ajv validation, PageConfig endpoints
- [x] **frontend**: PageRenderer, BoxRegistry, TableBox with pagination

### In Progress
- [ ] **data-ingestion**: DataModelSpec → PostgreSQL DDL
- [ ] **agent-runtime**: Tool execution engine
- [ ] **accounting-core**: Journal generation, posting

### Migration (from existing services)
- [ ] **plaid**: Adapt to platform contracts (~80% done)
- [ ] **stripe**: Adapt to platform contracts (~75% done)
- [ ] **accounting-db**: Migrate to accounting-core

## Key Concepts

### DataModelSpec
AI prompt → structured schema that generates:
- PostgreSQL tables and views
- PageConfig for UI rendering
- Accounting journal templates

### Tool Gateway
Secure execution layer for AI agents:
- Ajv validation against JSON Schema
- Confirmation flow for destructive actions
- Idempotency and audit logging

### PageConfig / BoxSpec
Config-driven UI rendering:
- Pages defined as JSON
- Boxes render based on type (table, form, chart)
- No frontend code changes for new screens

## Development

### Prerequisites
- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)

### Working with Submodules

```bash
# Pull latest changes for all submodules
git submodule update --remote --merge

# Push changes in a submodule
cd packages/frontend
git add . && git commit -m "feat: ..."
git push

# Update parent repo to point to new commits
cd ../..
git add packages/frontend
git commit -m "chore: update frontend submodule"
git push
```

### Environment Setup

```bash
# Copy environment files
cp packages/platform-api/.env.example packages/platform-api/.env
cp packages/frontend/.env.example packages/frontend/.env.local

# Start PostgreSQL
docker compose up -d postgres

# Run migrations
cd packages/platform-api && pnpm prisma migrate dev
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and decisions
- [Roadmap](./ROADMAP.md) - What's done, in progress, pending
- [Agent Context](./.claude/AGENT_CONTEXT.md) - Full context for AI agents
- [Contributing](./CONTRIBUTING.md) - How to work with this repo

## License

Proprietary - Roni AI Inc.
