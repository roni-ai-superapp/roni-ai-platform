/**
 * Stripe Client - Centralized Stripe SDK instance
 * Read-only operations for billing connector service
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Use latest API version supported by the SDK
      typescript: true,
      appInfo: {
        name: 'connector-stripe',
        version: '1.0.0',
      },
    });
  }

  return stripeInstance;
}

/**
 * Singleton Stripe client (lazy initialized)
 */
export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop) => {
    const client = getStripeClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});
