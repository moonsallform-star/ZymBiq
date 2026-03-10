// Zymbiq — src/app/(public)/checkout/order/[orderId]/page.tsx
// Custom order checkout: auth-gated, uses estimatedPrice from the order,
// renders payment method tabs based on admin-configured payment options.

import { notFound, redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { ShoppingBag, Lock, Bot } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent, stripe } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from "@/lib/constants";
import type { SiteConfigPayments } from "@/types/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const StripeCheckoutWrapper = nextDynamic(
  () => import("@/components/payments/stripe-checkout-form"),
  { ssr: false }
);

const ManualPaymentForm = nextDynamic(
  () => import("@/components/payments/manual-payment-form"),
  { ssr: false }
);

export const dynamic = "force-dynamic";

async function getPaymentsConfig(): Promise<SiteConfigPayments> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.PAYMENTS },
      select: { value: true },
    });
    if (!record?.value) return DEFAULT_SITE_CONFIG.payments as SiteConfigPayments;
    const parsed = JSON.parse(record.value) as Partial<SiteConfigPayments>;
    return { ...(DEFAULT_SITE_CONFIG.payments as SiteConfigPayments), ...parsed };
  } catch {
    return DEFAULT_SITE_CONFIG.payments as SiteConfigPayments;
  }
}

interface CustomCheckoutPageProps {
  params: { orderId: string };
}

export default async function CustomOrderCheckoutPage({ params }: CustomCheckoutPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?returnUrl=/checkout/order/${params.orderId}`);
  }

  // Fetch the order — must belong to this user, be a CUSTOM order, and be PENDING payment
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      trackingCode: true,
      orderType: true,
      paymentStatus: true,
      paymentIntentId: true,
      estimatedPrice: true,
      estimatedTimeline: true,
      amountUsd: true,
      userId: true,
      guestEmail: true,
      customBrief: true,
    },
  });

  if (!order) notFound();

  // Only the owner can access this checkout
  if (order.userId !== session.user.id) {
    redirect("/dashboard");
  }

  // If already paid, redirect to tracker
  if (order.paymentStatus === "PAID") {
    redirect(`/track/${order.trackingCode}`);
  }

  // Only custom orders use this page
  if (order.orderType !== "CUSTOM") {
    redirect("/dashboard");
  }

  const amountUsd = order.amountUsd ?? order.estimatedPrice ?? 0;

  if (amountUsd <= 0) {
    // No estimate yet — redirect to tracker with a message
    redirect(`/track/${order.trackingCode}?notice=awaiting-estimate`);
  }

  const paymentsConfig = await getPaymentsConfig();
  const { stripeEnabled, bkashEnabled, nagadEnabled } = paymentsConfig;
  const hasAnyPaymentMethod = stripeEnabled || bkashEnabled || nagadEnabled;

  let stripeClientSecret: string | null = null;

  if (stripeEnabled && hasAnyPaymentMethod) {
    try {
      if (order.paymentIntentId) {
        const existing = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        if (
          existing.status === "requires_payment_method" ||
          existing.status === "requires_confirmation" ||
          existing.status === "requires_action"
        ) {
          stripeClientSecret = existing.client_secret ?? null;
        }
      }

      if (!stripeClientSecret) {
        const intent = await createPaymentIntent(amountUsd, {
          orderId: order.id,
          userId: session.user.id,
          orderType: "CUSTOM",
        });
        stripeClientSecret = intent.client_secret ?? null;

        if (intent.id) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentIntentId: intent.id, amountUsd },
          });
        }
      }
    } catch (err) {
      console.error("[custom-checkout] Failed to create Stripe PaymentIntent:", err);
    }
  }

  return (
    <main className="forge-section min-h-screen bg-background py-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <Bot className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Custom Order Payment</h1>
            <p className="text-sm text-muted">
              Complete payment to start your custom project
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left — payment panel */}
          <section aria-label="Payment">
            <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted" aria-hidden="true" />
                <span className="text-xs text-muted">
                  Secure checkout — your data is encrypted
                </span>
              </div>

              {!hasAnyPaymentMethod && (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Payments are temporarily unavailable
                  </p>
                  <p className="text-xs text-muted max-w-xs mx-auto">
                    No payment methods are currently configured. Please contact the developer directly.
                  </p>
                  <a
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-[--zymbiq-radius] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/10 transition-colors"
                  >
                    Contact Developer
                  </a>
                </div>
              )}

              {hasAnyPaymentMethod && (
                <CustomPaymentTabs
                  stripeEnabled={stripeEnabled}
                  bkashEnabled={bkashEnabled}
                  nagadEnabled={nagadEnabled}
                  stripeClientSecret={stripeClientSecret}
                  orderId={order.id}
                  amountUsd={amountUsd}
                />
              )}
            </div>
          </section>

          {/* Right — order summary */}
          <aside aria-label="Order summary">
            <div className="rounded-[--zymbiq-radius] border border-border bg-surface shadow-sm overflow-hidden sticky top-6">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-semibold text-foreground">Custom Project</h2>
                </div>

                {order.estimatedTimeline && (
                  <p className="text-sm text-muted">
                    Estimated timeline:{" "}
                    <span className="font-medium text-foreground">{order.estimatedTimeline}</span>
                  </p>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted">Total</span>
                    <span className="text-2xl font-bold text-foreground tabular-nums">
                      {formatCurrency(amountUsd, "USD")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">One-time payment. No subscription.</p>
                </div>

                <ul className="space-y-1.5 pt-1">
                  {[
                    "Custom-built to your specifications",
                    "Full source code & documentation",
                    "Deployment assistance",
                    "30-day post-delivery support",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted">
                      <span className="mt-0.5 text-success shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-4">
                  <a
                    href={`/track/${order.trackingCode}`}
                    className="text-xs text-accent underline underline-offset-2 hover:text-accent/80"
                  >
                    View order tracker →
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

interface CustomPaymentTabsProps {
  stripeEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  stripeClientSecret: string | null;
  orderId: string;
  amountUsd: number;
}

function CustomPaymentTabs({
  stripeEnabled,
  bkashEnabled,
  nagadEnabled,
  stripeClientSecret,
  orderId,
  amountUsd,
}: CustomPaymentTabsProps) {
  const hasManual = bkashEnabled || nagadEnabled;

  if (stripeEnabled && !hasManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Pay with Card</h2>
        {stripeClientSecret ? (
          <StripeCheckoutWrapper clientSecret={stripeClientSecret} orderId={orderId} />
        ) : (
          <div className="rounded-[--zymbiq-radius] border border-border bg-muted/5 px-4 py-6 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">Card payments temporarily unavailable</p>
            <p className="text-xs text-muted">Please use bKash or Nagad, or contact the developer.</p>
          </div>
        )}
      </div>
    );
  }

  if (!stripeEnabled && hasManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Mobile Banking Payment</h2>
        <ManualPaymentForm orderId={orderId} amountUsd={amountUsd} />
      </div>
    );
  }

  const defaultTab = stripeEnabled ? "stripe" : "manual";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full mb-6">
        {stripeEnabled && <TabsTrigger value="stripe" className="flex-1">Card / Online</TabsTrigger>}
        {hasManual && <TabsTrigger value="manual" className="flex-1">bKash / Nagad</TabsTrigger>}
      </TabsList>

      {stripeEnabled && (
        <TabsContent value="stripe">
          {stripeClientSecret ? (
            <StripeCheckoutWrapper clientSecret={stripeClientSecret} orderId={orderId} />
          ) : (
            <div className="rounded-[--zymbiq-radius] border border-border bg-muted/5 px-4 py-6 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">Card payments temporarily unavailable</p>
              <p className="text-xs text-muted">Please use bKash or Nagad.</p>
            </div>
          )}
        </TabsContent>
      )}

      {hasManual && (
        <TabsContent value="manual">
          <ManualPaymentForm orderId={orderId} amountUsd={amountUsd} />
        </TabsContent>
      )}
    </Tabs>
  );
}