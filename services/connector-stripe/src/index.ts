/**
 * Connector Stripe Service
 *
 * Mirrors monolith billing endpoints with identical response shapes.
 * See: roniai-demo/docs/stripe-billing-contract.md
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { stripe } from './stripe-client.js';
import { authGuard, AuthenticatedRequest } from './auth.js';
import {
  extractInvoiceNumbers,
  unixToISO,
  centsToDollars,
  formatCurrency,
  sendError,
  setResponseHeaders,
} from './utils.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(authGuard);

// ===========================================================================
// Health Check
// ===========================================================================

const healthHandler = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'connector-stripe',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/healthz', healthHandler);

// ===========================================================================
// GET /api/org/billing/balance
// ===========================================================================

app.get(
  '/api/org/billing/balance',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      const balance = await stripe.balance.retrieve();
      const durationMs = Date.now() - t0;

      console.info({
        evt: 'billing.balance.retrieve',
        orgId: req.orgId,
        durationMs,
      });

      setResponseHeaders(res, 'Balance', false);

      res.json({
        success: true,
        data: {
          available: balance.available.map((b) => ({
            amount: centsToDollars(b.amount),
            currency: formatCurrency(b.currency),
          })),
          pending: balance.pending.map((b) => ({
            amount: centsToDollars(b.amount),
            currency: formatCurrency(b.currency),
          })),
        },
        meta: { durationMs },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// GET /api/org/billing/charges
// ===========================================================================

app.get(
  '/api/org/billing/charges',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      // Parse query parameters
      const limitParam = (req.query.limit as string) || '25';
      const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 100);
      const cursor = (req.query.cursor as string) || undefined;

      // Build Stripe request
      const params: Stripe.ChargeListParams = {
        limit,
        expand: ['data.balance_transaction', 'data.payment_intent'],
      };
      if (cursor) params.starting_after = cursor;

      // Fetch from Stripe
      const charges = await stripe.charges.list(params);
      const durationMs = Date.now() - t0;

      // Transform charges
      const rows = charges.data.map((c) => {
        const bt = c.balance_transaction as Stripe.BalanceTransaction | null;
        const pi = c.payment_intent as Stripe.PaymentIntent | null;

        // Get project number: PI metadata first, then charge metadata fallback
        const projectNumber =
          (pi?.metadata?.project_number as string | undefined) ||
          (c.metadata?.project_number as string | undefined) ||
          null;

        return {
          id: c.id,
          paymentIntent:
            typeof c.payment_intent === 'string'
              ? c.payment_intent
              : c.payment_intent?.id || null,
          amount: centsToDollars(c.amount),
          currency: formatCurrency(c.currency),
          status: c.status,
          paid: c.paid,
          created: unixToISO(c.created),
          customer:
            typeof c.customer === 'string'
              ? c.customer
              : c.customer?.id || null,
          description: c.description || null,
          receiptUrl: c.receipt_url || null,
          metadata: c.metadata,
          project_number: projectNumber,
          // Balance transaction data
          fee: bt ? centsToDollars(bt.fee) : null,
          net: bt ? centsToDollars(bt.net) : null,
          feeDetails: bt?.fee_details ?? [],
          balanceTransactionId: bt?.id ?? null,
          availableOn: bt ? unixToISO(bt.available_on) : null,
          reportingCategory: bt?.reporting_category ?? null,
          payoutId:
            typeof (bt as Stripe.BalanceTransaction & { payout?: string | Stripe.Payout })?.payout === 'string'
              ? (bt as Stripe.BalanceTransaction & { payout?: string })?.payout
              : ((bt as Stripe.BalanceTransaction & { payout?: Stripe.Payout })?.payout as Stripe.Payout | undefined)?.id || null,
        };
      });

      console.info({
        evt: 'billing.charges.list',
        orgId: req.orgId,
        limit,
        hasCursor: !!cursor,
        resultCount: charges.data.length,
        hasMore: charges.has_more,
        durationMs,
      });

      setResponseHeaders(res, 'Charges', false);

      res.json({
        success: true,
        data: rows,
        pagination: {
          hasMore: charges.has_more,
          cursor: charges.data.at(-1)?.id || null,
        },
        meta: { durationMs },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// GET /api/org/billing/customers
// ===========================================================================

app.get(
  '/api/org/billing/customers',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      // Parse query parameters
      const limitParam = (req.query.limit as string) || '25';
      const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 100);
      const cursor = (req.query.cursor as string) || undefined;
      const query = (req.query.query as string) || undefined;

      // Build Stripe request
      const params: Stripe.CustomerListParams = { limit };
      if (cursor) params.starting_after = cursor;
      if (query) {
        // Use search API for queries
        const searchResult = await stripe.customers.search({
          query: `email:"${query}" OR name:"${query}"`,
          limit,
        });

        const durationMs = Date.now() - t0;

        console.info({
          evt: 'billing.customers.search',
          orgId: req.orgId,
          query,
          resultCount: searchResult.data.length,
          durationMs,
        });

        setResponseHeaders(res, 'Customers', false);

        res.json({
          success: true,
          data: searchResult.data.map((c) => ({
            id: c.id,
            name: c.name || null,
            email: c.email || null,
            created: unixToISO(c.created),
            metadata: c.metadata,
          })),
          pagination: {
            hasMore: searchResult.has_more,
            cursor: searchResult.data.at(-1)?.id || null,
          },
          meta: { durationMs },
        });
        return;
      }

      // Standard list
      const customers = await stripe.customers.list(params);
      const durationMs = Date.now() - t0;

      console.info({
        evt: 'billing.customers.list',
        orgId: req.orgId,
        limit,
        hasCursor: !!cursor,
        resultCount: customers.data.length,
        hasMore: customers.has_more,
        durationMs,
      });

      setResponseHeaders(res, 'Customers', false);

      res.json({
        success: true,
        data: customers.data.map((c) => ({
          id: c.id,
          name: c.name || null,
          email: c.email || null,
          created: unixToISO(c.created),
          metadata: c.metadata,
        })),
        pagination: {
          hasMore: customers.has_more,
          cursor: customers.data.at(-1)?.id || null,
        },
        meta: { durationMs },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// GET /api/org/billing/payouts
// ===========================================================================

app.get(
  '/api/org/billing/payouts',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      // Parse query parameters
      const limitParam = (req.query.limit as string) || '20';
      const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 100);
      const cursor = (req.query.cursor as string) || undefined;
      const dateFrom = (req.query.date_from as string) || undefined;
      const dateTo = (req.query.date_to as string) || undefined;

      // Build Stripe payout request
      const params: Stripe.PayoutListParams = { limit };
      if (cursor) params.starting_after = cursor;

      // Filter by arrival date if provided
      if (dateFrom || dateTo) {
        params.arrival_date = {};
        if (dateFrom)
          params.arrival_date.gte = Math.floor(
            new Date(dateFrom).getTime() / 1000
          );
        if (dateTo)
          params.arrival_date.lte = Math.floor(
            new Date(dateTo).getTime() / 1000
          );
      }

      // Fetch payouts
      const payouts = await stripe.payouts.list(params);

      // Fetch balance transactions for each payout
      // Expand source.payment_intent to get project_number from PI metadata
      const payoutData = await Promise.all(
        payouts.data.map(async (payout) => {
          const bts = await stripe.balanceTransactions.list({
            payout: payout.id,
            expand: ['data.source', 'data.source.payment_intent'],
            limit: 100,
          });

          const chargeTransactions = bts.data.filter(
            (bt) => bt.type === 'charge'
          );

          let totalGross = 0;
          let totalFee = 0;
          let totalNet = 0;

          const items = chargeTransactions.map((bt) => {
            const source = bt.source as Stripe.Charge | null;
            const gross = centsToDollars(bt.amount);
            const fee = centsToDollars(bt.fee);
            const net = centsToDollars(bt.net);

            totalGross += gross;
            totalFee += fee;
            totalNet += net;

            const invoiceNums =
              source && 'description' in source
                ? extractInvoiceNumbers(source.description || null)
                : [];

            // Get project number from: charge metadata, or PI metadata
            const pi = source?.payment_intent as Stripe.PaymentIntent | null;
            const projectNumber =
              (source?.metadata?.project_number as string | undefined) ||
              (pi?.metadata?.project_number as string | undefined) ||
              null;

            return {
              chargeId: source?.id || bt.id,
              created: unixToISO(bt.created),
              gross,
              fee,
              net,
              projectNumber,
              invoiceNumbers: invoiceNums,
            };
          });

          return {
            id: payout.id,
            status: payout.status,
            arrivalDate: unixToISO(payout.arrival_date),
            method: payout.method,
            currency: formatCurrency(payout.currency),
            totals: {
              gross: totalGross,
              fee: totalFee,
              net: totalNet,
            },
            items,
          };
        })
      );

      const durationMs = Date.now() - t0;

      console.info({
        evt: 'billing.payouts.list',
        orgId: req.orgId,
        limit,
        hasCursor: !!cursor,
        dateFrom,
        dateTo,
        resultCount: payouts.data.length,
        hasMore: payouts.has_more,
        durationMs,
      });

      setResponseHeaders(res, 'Payouts', false);

      res.json({
        success: true,
        data: payoutData,
        pagination: {
          hasMore: payouts.has_more,
          cursor: payouts.data.at(-1)?.id || null,
        },
        meta: { durationMs },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// GET /api/org/billing/payouts/unremitted
// ===========================================================================

app.get(
  '/api/org/billing/payouts/unremitted',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      // Parse query parameters
      const asOfParam = req.query.as_of as string | undefined;
      const lookbackDaysParam = req.query.lookback_days as string | undefined;
      const fromParam = req.query.from as string | undefined;
      const toParam = req.query.to as string | undefined;

      // Determine date range
      let asOfEnd: Date;
      let from: Date;
      let lookbackDays: number;

      if (asOfParam) {
        // New mode: as_of
        const asOfDate = new Date(asOfParam);
        asOfEnd = new Date(asOfDate);
        asOfEnd.setUTCHours(23, 59, 59, 999);

        lookbackDays = lookbackDaysParam ? parseInt(lookbackDaysParam, 10) : 90;
        from = new Date(asOfEnd);
        from.setDate(from.getDate() - lookbackDays);
      } else {
        // Legacy mode: from/to
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setDate(defaultFrom.getDate() - 30);

        from = fromParam ? new Date(fromParam) : defaultFrom;
        asOfEnd = toParam ? new Date(toParam) : now;
        lookbackDays = Math.ceil(
          (asOfEnd.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      const fromUnix = Math.floor(from.getTime() / 1000);
      const asOfEndUnix = Math.floor(asOfEnd.getTime() / 1000);

      // Fetch charge balance transactions
      const balanceTransactions = await stripe.balanceTransactions.list({
        type: 'charge',
        created: { gte: fromUnix, lte: asOfEndUnix },
        limit: 100,
        expand: ['data.source'],
      });

      // Fetch payouts
      const payouts = await stripe.payouts.list({
        arrival_date: { lte: asOfEndUnix },
        created: { gte: fromUnix },
        limit: 100,
      });

      // Build remitted set
      const remittedBtIds = new Set<string>();
      await Promise.all(
        payouts.data.map(async (payout) => {
          const bts = await stripe.balanceTransactions.list({
            payout: payout.id,
            limit: 100,
          });
          bts.data.forEach((bt) => remittedBtIds.add(bt.id));
        })
      );

      // Partition charges
      let pendingCount = 0;
      let pendingNet = 0;
      let eligibleCount = 0;
      let eligibleNet = 0;

      const unremittedItems: Array<{
        chargeId: string;
        created: string;
        availableOn: string;
        gross: number;
        fee: number;
        net: number;
        description: string | null;
        receiptUrl: string | null;
        invoiceNumbers: string[];
        status: 'pending' | 'eligible';
      }> = [];

      for (const bt of balanceTransactions.data) {
        const charge = bt.source as Stripe.Charge;
        if (!charge || charge.object !== 'charge') continue;
        if (remittedBtIds.has(bt.id)) continue;

        const gross = centsToDollars(bt.amount);
        const fee = centsToDollars(bt.fee);
        const net = centsToDollars(bt.net);
        const availableOnUnix = bt.available_on;
        const isPending = availableOnUnix > asOfEndUnix;
        const status: 'pending' | 'eligible' = isPending
          ? 'pending'
          : 'eligible';

        if (isPending) {
          pendingCount++;
          pendingNet += net;
        } else {
          eligibleCount++;
          eligibleNet += net;
        }

        unremittedItems.push({
          chargeId: charge.id,
          created: unixToISO(charge.created),
          availableOn: unixToISO(availableOnUnix),
          gross,
          fee,
          net,
          description: charge.description || null,
          receiptUrl: charge.receipt_url || null,
          invoiceNumbers: extractInvoiceNumbers(charge.description || null),
          status,
        });
      }

      // Sort by availableOn
      unremittedItems.sort(
        (a, b) =>
          new Date(a.availableOn).getTime() - new Date(b.availableOn).getTime()
      );

      const durationMs = Date.now() - t0;

      console.info({
        evt: 'billing.payouts.unremitted',
        orgId: req.orgId,
        asOf: asOfEnd.toISOString(),
        lookbackDays,
        pendingCount,
        eligibleCount,
        durationMs,
      });

      setResponseHeaders(res, 'Unremitted', false);

      res.json({
        success: true,
        summary: {
          pending: {
            count: pendingCount,
            net: Math.round(pendingNet * 100) / 100,
          },
          eligible: {
            count: eligibleCount,
            net: Math.round(eligibleNet * 100) / 100,
          },
          total: {
            count: pendingCount + eligibleCount,
            net: Math.round((pendingNet + eligibleNet) * 100) / 100,
          },
          asOf: asOfEnd.toISOString(),
          window: {
            from: from.toISOString(),
            to: asOfEnd.toISOString(),
          },
        },
        items: unremittedItems,
        meta: { durationMs, lookbackDays },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// GET /api/org/projects/:id/stripe-charges
// ===========================================================================

app.get(
  '/api/org/projects/:id/stripe-charges',
  async (req: AuthenticatedRequest, res: Response) => {
    const t0 = Date.now();

    try {
      const projectId = req.params.id;
      const invoiceNumbersParam = req.query.invoice_numbers as string | undefined;

      // Get project_number from query param (monolith proxy should supply this)
      const projectNumber = (req.query.project_number as string) || null;

      // This endpoint needs invoice numbers to filter charges
      // In the monolith, these come from the database
      // Here, we expect them to be passed as a query parameter
      if (!invoiceNumbersParam) {
        // Match monolith message exactly
        res.json({
          success: true,
          data: {
            projectNumber,
            invoiceNumber: null,
            charges: [],
            matchedCount: 0,
            message: 'No invoices found for this project',
          },
        });
        return;
      }

      const invoiceNumbers = invoiceNumbersParam.split(',').filter(Boolean);

      // Fetch recent charges
      const stripeCharges = await stripe.charges.list({
        limit: 100,
        expand: ['data.balance_transaction', 'data.payment_intent'],
      });

      // Filter by invoice number match
      const matchedCharges = stripeCharges.data.filter((charge) => {
        if (!charge.description) return false;
        const chargeInvoiceNums = extractInvoiceNumbers(charge.description);
        return chargeInvoiceNums.some((num) => invoiceNumbers.includes(num));
      });

      // Transform - NOTE: amount in CENTS for this endpoint
      const charges = matchedCharges.map((charge) => {
        const pi = charge.payment_intent as Stripe.PaymentIntent | null;
        const card = charge.payment_method_details?.card;

        return {
          id: charge.id,
          amount: charge.amount, // CENTS, not dollars
          amountFormatted: (charge.amount / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: charge.currency.toUpperCase(),
          }),
          currency: formatCurrency(charge.currency),
          status: charge.status,
          created: unixToISO(charge.created),
          description: charge.description,
          receiptUrl: charge.receipt_url,
          paymentMethod: card
            ? {
                brand: card.brand || null,
                last4: card.last4 || null,
              }
            : null,
          metadata: pi?.metadata || charge.metadata,
        };
      });

      const durationMs = Date.now() - t0;

      console.info({
        evt: 'project.stripe-charges',
        projectId,
        invoiceNumbers,
        matchedCount: charges.length,
        durationMs,
      });

      res.json({
        success: true,
        data: {
          projectId,
          projectNumber,
          invoiceNumbers,
          charges,
          matchedCount: charges.length,
        },
      });
    } catch (error) {
      sendError(res, error, Date.now() - t0);
    }
  }
);

// ===========================================================================
// Start Server
// ===========================================================================

app.listen(PORT, () => {
  console.log(`Connector Stripe service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Auth mode: ${process.env.CONNECTOR_STRIPE_AUTH_TOKEN ? 'enabled' : 'disabled (dev)'}`);
});
