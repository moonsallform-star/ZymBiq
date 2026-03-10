// Zymbiq — src/app/(public)/checkout/[projectId]/page.tsx
// Checkout page: auth-gated, creates order + optional Stripe PaymentIntent,
// renders payment method tabs based on admin-configured payment options.

import { notFound, redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import Image from "next/image";
import { ShoppingBag, Lock } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent, stripe } from "@/lib/stripe";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from "@/lib/constants";
import type { SiteConfigPayments } from "@/types/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Dynamic imports — Stripe Elements and manual form are client-only
// ---------------------------------------------------------------------------

const StripeCheckoutWrapper = nextDynamic(
  () => import("@/components/payments/stripe-checkout-form"),
  { ssr: false }
);

const ManualPaymentForm = nextDynamic(
  () => import("@/components/payments/manual-payment-form"),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Force dynamic rendering — order state is personalized and time-sensitive
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch payments config from SiteConfig, fall back to defaults. */
async function getPaymentsConfig(): Promise<SiteConfigPayments> {
  try {
    const record = await prisma.siteConfig.findUnique({
      where: { key: SITE_CONFIG_KEYS.PAYMENTS },
      select: { value: true },
    });

    if (!record?.value) return DEFAULT_SITE_CONFIG.payments as SiteConfigPayments;

    const parsed = JSON.parse(record.value) as Partial<SiteConfigPayments>;
    return {
      ...(DEFAULT_SITE_CONFIG.payments as SiteConfigPayments),
      ...parsed,
    };
  } catch {
    return DEFAULT_SITE_CONFIG.payments as SiteConfigPayments;
  }
}

/** Find an existing pending order or create a new one for this user + project. */
async function findOrCreateOrder(
  userId: string,
  projectId: string,
  amountUsd: number
): Promise<{ id: string; trackingCode: string; paymentIntentId: string | null }> {
  // Run inside a serializable transaction to prevent duplicate orders being
  // created if the user double-submits or opens two tabs simultaneously.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findFirst({
      where: {
        userId,
        projectId,
        paymentStatus: { in: ["PENDING", "PENDING_MANUAL_VERIFICATION"] },
      },
      select: { id: true, trackingCode: true, paymentIntentId: true },
      orderBy: { createdAt: "desc" },
    });

    if (existing) return existing;

    return tx.order.create({
      data: {
        userId,
        projectId,
        orderType: "PREBUILT",
        paymentMethod: "STRIPE",
        status: "NEW",
        paymentStatus: "PENDING",
        amountUsd,
      },
      select: { id: true, trackingCode: true, paymentIntentId: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface CheckoutPageProps {
  params: { projectId: string };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?returnUrl=/checkout/${params.projectId}`);
  }

  const userId = session.user.id;

  // ── Project lookup ─────────────────────────────────────────────────────────
  const project = await prisma.project.findUnique({
    where: { id: params.projectId, isVisible: true },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      thumbnailUrl: true,
      category: true,
      techStack: true,
      buildTime: true,
      slug: true,
    },
  });

  if (!project) notFound();

  // ── Already-purchased guard ────────────────────────────────────────────────
  const alreadyOwned = await prisma.order.findFirst({
    where: {
      userId,
      projectId: project.id,
      paymentStatus: "PAID",
    },
    select: { id: true, trackingCode: true },
  });

  // ── Payment config ─────────────────────────────────────────────────────────
  const paymentsConfig = await getPaymentsConfig();
  const { stripeEnabled, bkashEnabled, nagadEnabled } = paymentsConfig;
  const hasAnyPaymentMethod = stripeEnabled || bkashEnabled || nagadEnabled;

  // ── Order creation (only if not already owned and a method is available) ───
  let orderId: string | null = null;
  let trackingCode: string | null = null;
  let stripeClientSecret: string | null = null;

  if (!alreadyOwned && hasAnyPaymentMethod) {
    const order = await findOrCreateOrder(userId, project.id, project.price);
    orderId = order.id;
    trackingCode = order.trackingCode;

    // Create Stripe PaymentIntent if Stripe is enabled
    if (stripeEnabled) {
      try {
        // Reuse existing intent if the order already has one
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

        // No reusable intent found — create a fresh one
        if (!stripeClientSecret) {
          const intent = await createPaymentIntent(project.price, {
            projectId: project.id,
            userId,
            orderId: order.id,
          });

          stripeClientSecret = intent.client_secret ?? null;

          if (intent.id) {
            await prisma.order.update({
              where: { id: order.id },
              data: { paymentIntentId: intent.id },
            });
          }
        }
      } catch (err) {
        console.error("[checkout] Failed to create Stripe PaymentIntent:", err);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="forge-section min-h-screen bg-background py-16 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Page heading */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <ShoppingBag className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
            <p className="text-sm text-muted">
              Complete your purchase to get instant access
            </p>
          </div>
        </div>

        {/* ── Already owned ───────────────────────────────────────────────── */}
        {alreadyOwned && (
          <AlreadyOwnedBanner trackingCode={alreadyOwned.trackingCode} />
        )}

        {/* ── Main checkout layout ─────────────────────────────────────────── */}
        {!alreadyOwned && (
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
                  <NoPaymentMethodsNotice />
                )}

                {hasAnyPaymentMethod && orderId && (
                  <PaymentTabs
                    stripeEnabled={stripeEnabled}
                    bkashEnabled={bkashEnabled}
                    nagadEnabled={nagadEnabled}
                    stripeClientSecret={stripeClientSecret}
                    orderId={orderId}
                    amountUsd={project.price}
                    trackingCode={trackingCode ?? ""}
                  />
                )}
              </div>
            </section>

            {/* Right — order summary */}
            <aside aria-label="Order summary">
              <OrderSummary project={project} />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Shown when the user has already paid for this project. */
function AlreadyOwnedBanner({ trackingCode }: { trackingCode: string }) {
  return (
    <div className="rounded-[--zymbiq-radius] border border-border bg-surface p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <ShoppingBag className="h-7 w-7 text-success" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        You already own this project
      </h2>
      <p className="text-sm text-muted max-w-sm mx-auto">
        You have previously purchased this project. Access your delivery details
        and files from your order tracker.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <a
          href={`/track/${trackingCode}`}
          className="inline-flex items-center justify-center rounded-[--zymbiq-radius] bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          View Order
        </a>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-[--zymbiq-radius] border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/10 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

/** Shown when the admin has not enabled any payment method. */
function NoPaymentMethodsNotice() {
  return (
    <div className="py-8 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">
        Payments are temporarily unavailable
      </p>
      <p className="text-xs text-muted max-w-xs mx-auto">
        No payment methods are currently configured. Please contact the developer
        directly to complete your purchase.
      </p>
      <a
        href="/contact"
        className="inline-flex items-center justify-center rounded-[--zymbiq-radius] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/10 transition-colors"
      >
        Contact Developer
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment tabs — conditionally renders Stripe and/or manual method tabs
// ---------------------------------------------------------------------------

interface PaymentTabsProps {
  stripeEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  stripeClientSecret: string | null;
  orderId: string;
  amountUsd: number;
  trackingCode: string;
}

function PaymentTabs({
  stripeEnabled,
  bkashEnabled,
  nagadEnabled,
  stripeClientSecret,
  orderId,
  amountUsd,
  trackingCode,
}: PaymentTabsProps) {
  const hasManual = bkashEnabled || nagadEnabled;

  // Only Stripe
  if (stripeEnabled && !hasManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Pay with Card
        </h2>
        {stripeClientSecret ? (
          <StripeCheckoutWrapper
            clientSecret={stripeClientSecret}
            orderId={orderId}
          />
        ) : (
          <StripeUnavailableNotice />
        )}
      </div>
    );
  }

  // Only manual (bKash / Nagad)
  if (!stripeEnabled && hasManual) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Mobile Banking Payment
        </h2>
        <ManualPaymentForm
          orderId={orderId}
          amountUsd={amountUsd}
        />
      </div>
    );
  }

  // Both — tabbed
  const defaultTab = stripeEnabled ? "stripe" : "manual";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full mb-6">
        {stripeEnabled && (
          <TabsTrigger value="stripe" className="flex-1">
            Card / Online
          </TabsTrigger>
        )}
        {hasManual && (
          <TabsTrigger value="manual" className="flex-1">
            bKash / Nagad
          </TabsTrigger>
        )}
      </TabsList>

      {stripeEnabled && (
        <TabsContent value="stripe">
          <div className="space-y-4">
            {stripeClientSecret ? (
              <StripeCheckoutWrapper
                clientSecret={stripeClientSecret}
                orderId={orderId}
              />
            ) : (
              <StripeUnavailableNotice />
            )}
          </div>
        </TabsContent>
      )}

      {hasManual && (
        <TabsContent value="manual">
          <ManualPaymentForm
            orderId={orderId}
            amountUsd={amountUsd}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

/** Shown when Stripe is enabled but PaymentIntent creation failed. */
function StripeUnavailableNotice() {
  return (
    <div className="rounded-[--zymbiq-radius] border border-border bg-muted/5 px-4 py-6 text-center space-y-2">
      <p className="text-sm font-medium text-foreground">
        Card payments are temporarily unavailable
      </p>
      <p className="text-xs text-muted">
        Please use bKash or Nagad, or contact the developer directly.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order summary sidebar
// ---------------------------------------------------------------------------

interface OrderSummaryProject {
  title: string;
  description: string;
  price: number;
  thumbnailUrl: string | null;
  category: string;
  techStack: string[];
  buildTime: string;
  slug: string;
}

function OrderSummary({ project }: { project: OrderSummaryProject }) {
  return (
    <div className="rounded-[--zymbiq-radius] border border-border bg-surface shadow-sm overflow-hidden sticky top-6">
      {/* Thumbnail */}
      <div className="aspect-video relative bg-muted/10 overflow-hidden">
        {project.thumbnailUrl ? (
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 400px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              {project.category}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground leading-snug">
            {project.title}
          </h2>
          <p className="mt-1 text-sm text-muted line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Tech stack */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted"
              >
                {tech}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="inline-flex items-center rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted">
                +{project.techStack.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Build time */}
        <p className="text-xs text-muted">
          Estimated build time:{" "}
          <span className="font-medium text-foreground">{project.buildTime}</span>
        </p>

        {/* Divider */}
        <div className="border-t border-border pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(project.price, "USD")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">One-time payment. No subscription.</p>
        </div>

        {/* Deliverables note */}
        <ul className="space-y-1.5 pt-1">
          {[
            "GitHub repository access",
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
      </div>
    </div>
  );
}