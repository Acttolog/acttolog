import 'server-only';

/**
 * Modular payment architecture (spec §42–43).
 * Providers plug in behind this interface; nothing is enabled until a
 * provider is explicitly authorized. A payment is NEVER reported successful
 * without provider verification (webhook or explicit capture check).
 */

export interface PaymentIntent {
  id: string;
  provider: string;
  amount: number;
  currency: 'NPR' | 'USD';
  clientSecret?: string;
  status: 'initiated';
}

export interface PaymentProvider {
  id: string;
  configured: () => boolean;
  createIntent: (opts: { amount: number; currency: 'NPR' | 'USD'; offerSlug: string; email: string }) => Promise<PaymentIntent>;
  /** Verify with the provider — the only source of truth for success. */
  verify: (providerRef: string) => Promise<'verified' | 'failed' | 'pending'>;
}

/** Fallback provider: honestly not configured. */
const notConfigured: PaymentProvider = {
  id: 'none',
  configured: () => false,
  createIntent: async () => {
    throw new Error('payment_provider_not_configured');
  },
  verify: async () => 'failed',
};

/**
 * Registry — add authorized providers here (e.g. Stripe, eSewa, Khalti,
 * PayHere) behind their own env flags. Until then the registry returns the
 * honest not-configured provider and the UI offers inquiry-only flows.
 */
export function getPaymentProvider(): PaymentProvider {
  const chosen = process.env.PAYMENT_PROVIDER;
  if (!chosen || !process.env.PAYMENT_SECRET_KEY) return notConfigured;
  // Future: switch (chosen) { case 'stripe': return stripeProvider; ... }
  return notConfigured;
}

export const paymentsConfigured = (): boolean => getPaymentProvider().configured();
