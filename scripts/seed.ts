// =============================================================================
// Zymbiq — scripts/seed.ts
// Idempotent database seed: admin user, SiteConfig defaults, pricing tiers,
// and sample FAQ items. Safe to re-run — all writes use upsert.
// =============================================================================

import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEYS } from "../src/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a SITE_CONFIG_KEYS value to its DEFAULT_SITE_CONFIG property key. */
const CONFIG_KEY_TO_DEFAULT: Record<string, keyof typeof DEFAULT_SITE_CONFIG> =
  {
    [SITE_CONFIG_KEYS.APPEARANCE]: "appearance",
    [SITE_CONFIG_KEYS.LAYOUT]: "layout",
    [SITE_CONFIG_KEYS.CONTENT]: "content",
    [SITE_CONFIG_KEYS.AI]: "ai",
    [SITE_CONFIG_KEYS.COMMUNICATION]: "communication",
    [SITE_CONFIG_KEYS.DEVFORGE]: "devforge",
    [SITE_CONFIG_KEYS.PAYMENTS]: "payments",
    [SITE_CONFIG_KEYS.PLATFORM]: "platform",
  };

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // ── 0. Validate required env vars ────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required to run the seed script."
    );
  }

  // ── 1. Admin user ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      isAdmin: true,
      name: "Admin",
    },
    create: {
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
    },
  });

  console.log(`✅  Admin user seeded — ${adminEmail}`);

  // ── 2. SiteConfig defaults ────────────────────────────────────────────────
  // update: {} means "do nothing if the key already exists", preserving any
  // admin-configured values from a previous deployment.

  for (const [envKey, configKey] of Object.entries(SITE_CONFIG_KEYS)) {
    const defaultKey = CONFIG_KEY_TO_DEFAULT[configKey];

    if (!defaultKey) {
      console.warn(`⚠️   No DEFAULT_SITE_CONFIG entry for key "${configKey}" — skipping.`);
      continue;
    }

    const defaultValue = DEFAULT_SITE_CONFIG[defaultKey];

    await prisma.siteConfig.upsert({
      where: { key: configKey },
      update: {}, // Preserve existing config — never overwrite admin changes
      create: {
        key: configKey,
        value: JSON.stringify(defaultValue),
        category: configKey,
      },
    });

    console.log(`✅  SiteConfig "${configKey}" seeded`);
  }

  // ── 3. Default Pricing Tiers ──────────────────────────────────────────────

  const pricingTiers = [
    {
      name: "Starter",
      price: 299,
      billingLabel: "one-time",
      features: [
        "Fully responsive design",
        "Up to 5 pages",
        "Contact form integration",
        "SEO optimized",
        "Deployment assistance",
        "7-day revision window",
      ],
      isRecommended: false,
      ctaLabel: "Get Started",
      sortOrder: 0,
      isVisible: true,
    },
    {
      name: "Professional",
      price: 699,
      billingLabel: "one-time",
      features: [
        "Everything in Starter",
        "Up to 15 pages",
        "CMS / blog integration",
        "Advanced animations",
        "Payment integration",
        "Performance optimization",
        "14-day revision window",
        "Priority delivery",
      ],
      isRecommended: true,
      ctaLabel: "Get Started",
      sortOrder: 1,
      isVisible: true,
    },
    {
      name: "Enterprise",
      price: 1499,
      billingLabel: "one-time",
      features: [
        "Everything in Professional",
        "Unlimited pages",
        "Custom backend / API",
        "Third-party integrations",
        "Admin dashboard",
        "Advanced analytics",
        "30-day revision window",
        "Dedicated support",
        "Source code + documentation",
      ],
      isRecommended: false,
      ctaLabel: "Contact for Custom Quote",
      sortOrder: 2,
      isVisible: true,
    },
  ] as const;

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { name: tier.name } as never, // name has no @@unique — handled below
      update: {},
      create: tier as never,
    }).catch(async () => {
      // PricingTier has no @@unique on name; fall back to findFirst + createIfMissing
      const existing = await prisma.pricingTier.findFirst({
        where: { name: tier.name },
      });

      if (!existing) {
        await prisma.pricingTier.create({ data: tier as never });
        console.log(`✅  Pricing tier "${tier.name}" created`);
      } else {
        console.log(`⏭️   Pricing tier "${tier.name}" already exists — skipped`);
      }
    });
  }

  console.log("✅  Pricing tiers seeded");

  // ── 4. Sample FAQ items ───────────────────────────────────────────────────

  const faqItems = [
    {
      category: "general",
      question: "How does the custom order process work?",
      answer:
        "You start by describing your project through our AI-guided conversation on the Order page. The assistant asks a series of focused questions about your industry, required features, style preferences, and budget. Once the brief is complete, you receive an instant price and timeline estimate. After you submit your contact details, I review the brief and begin building your project. You can track progress in real time via your unique tracking link.",
      sortOrder: 0,
      isVisible: true,
    },
    {
      category: "general",
      question: "How long does delivery take?",
      answer:
        "Delivery time depends on project complexity. Simple landing pages typically take 3–5 business days. Medium projects with multiple pages and integrations usually take 7–14 days. Complex or enterprise-level builds are scoped individually and may take 3–6 weeks. Your estimate includes a projected timeline, and the order tracker keeps you updated at every phase.",
      sortOrder: 1,
      isVisible: true,
    },
    {
      category: "general",
      question: "What do I receive when my project is delivered?",
      answer:
        "You receive full access to the GitHub repository containing all source code, a README with setup and deployment instructions, any required environment variable documentation, and live deployment assistance to get your site live on your preferred hosting platform.",
      sortOrder: 2,
      isVisible: true,
    },
    {
      category: "general",
      question: "What payment methods are accepted?",
      answer:
        "International clients can pay securely via Stripe using any major credit or debit card. Bangladeshi clients can pay via bKash or Nagad. All payment options are displayed at checkout based on availability.",
      sortOrder: 3,
      isVisible: true,
    },
    {
      category: "pricing",
      question: "Are there any recurring fees after delivery?",
      answer:
        "No. All projects are priced as one-time payments. You own the code outright after delivery. Any third-party services your project uses (hosting, databases, email providers) are subscribed to by you directly at their standard rates.",
      sortOrder: 0,
      isVisible: true,
    },
    {
      category: "pricing",
      question: "Can I request changes after delivery?",
      answer:
        "Yes. Each tier includes a revision window (7, 14, or 30 days depending on your plan) during which reasonable change requests are included at no extra cost. Larger scope changes or requests outside the revision window are quoted separately.",
      sortOrder: 1,
      isVisible: true,
    },
  ] as const;

  for (const item of faqItems) {
    // FaqItem has no @@unique on question — use findFirst pattern
    const existing = await prisma.faqItem.findFirst({
      where: { question: item.question },
    });

    if (!existing) {
      await prisma.faqItem.create({ data: item as never });
    }
  }

  console.log("✅  FAQ items seeded");

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n🎉  Seed complete.");
}

main()
  .catch((error: unknown) => {
    console.error("❌  Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });