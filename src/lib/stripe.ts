import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "[stripe.ts] STRIPE_SECRET_KEY environment variable is not set. " +
      "The application cannot start without a valid Stripe secret key."
  );
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error(
    "[stripe.ts] STRIPE_WEBHOOK_SECRET environment variable is not set. " +
      "Webhook signature verification will fail without this value."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
  appInfo: {
    name: "Zymbiq",
    version: "1.0.0",
  },
});

/**
 * Creates a Stripe PaymentIntent for a one-time USD payment.
 *
 * @param amountUsd - The amount in US dollars (e.g., 49.99). Converted
 *                    internally to integer cents as Stripe requires.
 * @param metadata  - Arbitrary key-value pairs attached to the PaymentIntent
 *                    (e.g., projectId, userId). Visible in the Stripe dashboard
 *                    and returned in webhook events.
 * @returns The created Stripe PaymentIntent object.
 * @throws  Will throw a Stripe error if the API call fails (invalid key,
 *          network error, etc.). Callers must catch and handle this.
 */
export async function createPaymentIntent(
  amountUsd: number,
  metadata: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  if (typeof amountUsd !== "number" || isNaN(amountUsd) || amountUsd <= 0) {
    throw new Error(
      `[createPaymentIntent] Invalid amountUsd: "${amountUsd}". ` +
        "Must be a positive finite number."
    );
  }

  // Stripe requires the amount as a non-negative integer in the smallest
  // currency unit (cents for USD). Math.round prevents floating-point
  // artifacts such as 49.99 * 100 = 4998.999999999999.
  const amountCents = Math.round(amountUsd * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Reconstructs and verifies a Stripe webhook event from the raw request body
 * and the Stripe-Signature header.
 *
 * IMPORTANT: The raw (unparsed) request body must be passed here. If Next.js
 * or any middleware has already parsed the body to JSON, the signature check
 * will fail because Stripe signs the exact bytes it sent.
 *
 * @param body      - The raw request body as a string or Buffer.
 * @param signature - The value of the "Stripe-Signature" HTTP header.
 * @returns The verified Stripe.Event object.
 * @throws  Will throw a Stripe.errors.StripeSignatureVerificationError if the
 *          signature is invalid or the webhook secret is wrong. Callers (the
 *          webhook route handler) must catch this and return HTTP 400.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  // STRIPE_WEBHOOK_SECRET is guaranteed to be defined — checked at module load.
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}