# Connector Stripe Service

Read-only Stripe billing connector that mirrors monolith billing endpoints.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/healthz` | Health check (Railway alias) |
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

Error responses (no timestamp, matching monolith):

```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Human-readable message" }
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

## Connector Mode Notes

### `/api/org/projects/:id/stripe-charges`

In connector mode (standalone, no DB), this endpoint requires query parameters that the monolith proxy should supply:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `invoice_numbers` | Yes | Comma-separated invoice numbers (e.g., `123,456`) |
| `project_number` | No | Project number to include in response |

**Example:**
```
GET /api/org/projects/abc123/stripe-charges?invoice_numbers=12345,12346&project_number=PRJ-001
```

Without `invoice_numbers`, returns:
```json
{
  "success": true,
  "data": {
    "projectNumber": null,
    "invoiceNumber": null,
    "charges": [],
    "matchedCount": 0,
    "message": "No invoices found for this project"
  }
}
```

### Project Number Resolution

Project numbers are resolved from Stripe metadata without database lookup:

1. **Charges endpoint**: Checks `payment_intent.metadata.project_number`, then `charge.metadata.project_number`
2. **Payouts endpoint**: Checks `charge.metadata.project_number`, then `charge.payment_intent.metadata.project_number`

For full project number resolution (invoice-to-project mapping), database integration is required.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

## Contract Reference

See `roniai-demo/docs/stripe-billing-contract.md` for the complete API contract that this service implements.

## Important Notes

1. **Amount handling**: All billing endpoints return amounts in **dollars**, except `/projects/:id/stripe-charges` which uses **cents** (with `amountFormatted` field)
2. **Currency**: All currency codes are **UPPERCASE** (e.g., "USD")
3. **Timestamps**: All timestamps are **ISO 8601** format
4. **Error envelope**: Matches monolith exactly (no `timestamp` field in error responses)
