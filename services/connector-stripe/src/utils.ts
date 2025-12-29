/**
 * Utility functions for Stripe billing connector
 */

import { Response } from 'express';
import Stripe from 'stripe';

/**
 * Extract invoice numbers from Stripe payment description
 * Pattern: Invoice #12345
 */
export function extractInvoiceNumbers(description: string | null): string[] {
  if (!description) return [];
  const matches = description.match(/Invoice #(\d+)/gi);
  if (!matches) return [];
  return matches.map((m) => m.replace(/Invoice #/i, ''));
}

/**
 * Convert Stripe Unix timestamp to ISO 8601
 */
export function unixToISO(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toISOString();
}

/**
 * Convert Stripe cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Uppercase currency code
 */
export function formatCurrency(currency: string): string {
  return currency.toUpperCase();
}

/**
 * Map Stripe error types to standard error codes
 */
export function mapStripeError(error: unknown): {
  code: string;
  message: string;
  status: number;
} {
  if (error instanceof Stripe.errors.StripeError) {
    if (error.type === 'StripeAuthenticationError') {
      return {
        code: 'STRIPE_AUTH_ERROR',
        message: 'Invalid Stripe API key',
        status: 401,
      };
    }
    if (error.type === 'StripeRateLimitError') {
      return {
        code: 'STRIPE_RATE_LIMIT',
        message: 'Too many requests, please retry shortly',
        status: 429,
      };
    }
    if (error.type === 'StripeInvalidRequestError') {
      return {
        code: 'STRIPE_INVALID_REQUEST',
        message: 'Invalid request to Stripe API',
        status: 400,
      };
    }
  }

  return {
    code: 'UPSTREAM_ERROR',
    message: 'Failed to process request',
    status: 500,
  };
}

/**
 * Send error response
 * Note: Monolith does NOT include timestamp in error envelope
 */
export function sendError(
  res: Response,
  error: unknown,
  durationMs?: number
): void {
  const { code, message, status } = mapStripeError(error);

  console.error({
    evt: 'connector.error',
    errorCode: code,
    message: error instanceof Error ? error.message : String(error),
    durationMs,
  });

  // Match monolith error shape exactly (no timestamp field)
  res.status(status).json({
    success: false,
    error: { code, message },
  });
}

/**
 * Set common response headers
 */
export function setResponseHeaders(
  res: Response,
  endpoint: string,
  cacheHit: boolean,
  timing?: string
): void {
  res.set(`X-${endpoint}-Cache-Hit`, String(cacheHit));
  if (timing) {
    res.set(`X-${endpoint}-Timing`, timing);
  }
  res.set('Cache-Control', 'private, max-age=30');
}
