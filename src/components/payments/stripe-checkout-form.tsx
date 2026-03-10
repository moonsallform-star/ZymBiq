"use client";

import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Stripe promise — singleton, created once outside component tree
// ---------------------------------------------------------------------------

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StripeCheckoutFormProps {
  clientSecret: string;
  orderId: string;
  returnUrl?: string;
}

// ---------------------------------------------------------------------------
// Inner form (must be inside <Elements>)
// ---------------------------------------------------------------------------

function StripeCheckoutForm({
  orderId,
  returnUrl,
}: Omit<StripeCheckoutFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMessage(null);

    const destination =
      returnUrl ??
      `${window.location.origin}/dashboard/orders?payment=success&orderId=${orderId}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: destination,
      },
    });

    // If we reach here Stripe did NOT redirect — an error occurred.
    if (error) {
      const msg =
        error.message ?? "Payment failed. Please try again.";
      setErrorMessage(msg);
      toast({ title: "Payment failed", description: msg, variant: "destructive" });
      setIsLoading(false);
    }
    // On success Stripe redirects automatically — no further code runs.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Stripe's hosted payment UI */}
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {/* Inline error message */}
      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Processing…
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Public wrapper — provides Elements context then renders the inner form
// ---------------------------------------------------------------------------

export default function StripeCheckoutWrapper({
  clientSecret,
  orderId,
  returnUrl,
}: StripeCheckoutFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "var(--zymbiq-accent)",
            colorBackground: "var(--zymbiq-surface)",
            colorText: "var(--zymbiq-text)",
            colorDanger: "var(--zymbiq-error, #EF4444)",
            borderRadius: "var(--zymbiq-radius, 8px)",
            fontFamily: "var(--font-body, sans-serif)",
          },
        },
      }}
    >
      <StripeCheckoutForm orderId={orderId} returnUrl={returnUrl} />
    </Elements>
  );
}