# Connector Stripe Service

Read-only Stripe billing connector that mirrors monolith billing endpoints.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/org/billing/balance` | Stripe account balance (available + pending) |
| `GET /api/org/billing/charges` | Paginated charges with fee details |
| `GET /api/org/billing/customers` | Paginated customers with search |
| `GET /api/org/billing/payouts` | Payouts with balance transaction breakdown |
| `GET /api/org/billing/payouts/unremitted` | Unremitted charges (pending + eligible) |
| `GET /api/org/projects/:id/stripe-charges` | Project-specific charge matching |

## Response Format

All endpoints return a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "hasMore": boolean, "cursor": string | null },
  "meta": { "durationMs": number }
}
```

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `CONNECTOR_STRIPE_AUTH_TOKEN` | No | Auth token for connector requests |
| `PORT` | No | Server port (default: 3002) |

## Authentication

If `CONNECTOR_STRIPE_AUTH_TOKEN` is set, requests must include:
- `Authorization: Bearer <token>`, or
- `x-connector-token: <token>`

If not set (dev mode), all requests are allowed.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck
```

## Contract Reference

See `roniai-demo/docs/stripe-billing-contract.md` for the complete API contract that this service implements.

## Important Notes

1. **Amount handling**: All billing endpoints return amounts in **dollars**, except `/projects/:id/stripe-charges` which uses **cents** (with `amountFormatted` field)
2. **Currency**: All currency codes are **UPPERCASE** (e.g., "USD")
3. **Timestamps**: All timestamps are **ISO 8601** format
4. **Project numbers**: Currently returns `null` - requires database lookup implementation
