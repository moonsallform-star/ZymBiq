// src/lib/constants.ts

// ---------------------------------------------------------------------------
// Order & Payment Labels
// ---------------------------------------------------------------------------

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "New Order",
  IN_DISCUSSION: "In Discussion",
  BUILDING: "Building",
  REVIEW: "Review",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Stripe",
  BKASH: "bKash",
  NAGAD: "Nagad",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PENDING_MANUAL_VERIFICATION: "Awaiting Verification",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

// ---------------------------------------------------------------------------
// Project Metadata Options
// ---------------------------------------------------------------------------

export const PROJECT_CATEGORIES: string[] = [
  "Restaurant",
  "E-commerce",
  "Portfolio",
  "SaaS",
  "Blog",
  "Landing Page",
  "Agency",
  "Healthcare",
  "Education",
  "Real Estate",
];

export const TECH_STACK_OPTIONS: string[] = [
  "Next.js",
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "PostgreSQL",
  "MongoDB",
  "MySQL",
  "Tailwind CSS",
  "Prisma",
  "Stripe",
  "Supabase",
  "Firebase",
  "Cloudinary",
  "GraphQL",
  "REST API",
  "Framer Motion",
  "Three.js",
  "tRPC",
  "Resend",
];

export const COMPLEXITY_LEVELS: string[] = [
  "simple",
  "medium",
  "complex",
  "enterprise",
];

export const COMPLEXITY_LABELS: Record<string, string> = {
  simple: "Simple",
  medium: "Medium",
  complex: "Complex",
  enterprise: "Enterprise",
};

export const ANIMATION_INTENSITIES = ["subtle", "reduced", "off"] as const;
export type AnimationIntensity = (typeof ANIMATION_INTENSITIES)[number];

// ---------------------------------------------------------------------------
// SiteConfig Keys
// ---------------------------------------------------------------------------

export const SITE_CONFIG_KEYS = {
  APPEARANCE: "appearance",
  LAYOUT: "layout",
  CONTENT: "content",
  AI: "ai",
  COMMUNICATION: "communication",
  DEVFORGE: "devforge",
  PAYMENTS: "payments",
  PLATFORM: "platform",
} as const;

export type SiteConfigKey = (typeof SITE_CONFIG_KEYS)[keyof typeof SITE_CONFIG_KEYS];

// ---------------------------------------------------------------------------
// TanStack Query Key Factories
// ---------------------------------------------------------------------------

export const QUERY_KEYS = {
  projects: (filters?: Record<string, unknown>) =>
    filters ? (["projects", filters] as const) : (["projects"] as const),
  project: (slug: string) => ["project", slug] as const,
  orders: (filters?: Record<string, unknown>) =>
    filters ? (["orders", filters] as const) : (["orders"] as const),
  order: (id: string) => ["order", id] as const,
  messages: (threadId?: string) =>
    threadId ? (["messages", threadId] as const) : (["messages"] as const),
  siteConfig: () => ["site-config"] as const,
  devforge: () => ["devforge"] as const,
  blog: (filters?: Record<string, unknown>) =>
    filters ? (["blog", filters] as const) : (["blog"] as const),
  blogPost: (slug: string) => ["blog-post", slug] as const,
  testimonials: () => ["testimonials"] as const,
  faqs: (category?: string) =>
    category ? (["faqs", category] as const) : (["faqs"] as const),
  pricing: () => ["pricing"] as const,
  clients: () => ["clients"] as const,
  analytics: (range?: string) =>
    range ? (["analytics", range] as const) : (["analytics"] as const),
  payments: (status?: string) =>
    status ? (["payments", status] as const) : (["payments"] as const),
  stats: () => ["stats"] as const,
} as const;

// ---------------------------------------------------------------------------
// Default SiteConfig — used as fallback when DB is unavailable or unseeded
// ---------------------------------------------------------------------------

export const DEFAULT_SITE_CONFIG = {
  appearance: {
    primaryColor: "#111827",
    secondaryColor: "#374151",
    accentColor: "#6366F1",
    backgroundColor: "#FAFAFA",
    textColor: "#111827",
    mutedColor: "#6B7280",
    headingFont: "Inter",
    bodyFont: "Inter",
    spacingScale: "default",
    borderRadius: "soft",
    darkMode: false,
    logoUrl: "",
    faviconUrl: "",
  },

  layout: {
    heroEnabled: true,
    trustStripEnabled: true,
    carouselEnabled: true,
    statsEnabled: true,
    howItWorksEnabled: true,
    devforgeEnabled: true,
    testimonialsEnabled: true,
    finalCtaEnabled: true,
    sectionOrder: [
      "hero",
      "trustStrip",
      "carousel",
      "stats",
      "howItWorks",
      "devforge",
      "testimonials",
      "finalCta",
    ] as string[],
    animationIntensity: "subtle" as AnimationIntensity,
    gridStyle: "default",
    cardStyle: "default",
  },

  content: {
    heroHeadline: "Production-Ready Websites. Built to Impress.",
    heroSubheadline:
      "Browse pre-built projects or order a custom site tailored to your business.",
    heroCta1: "Browse Projects",
    heroCta2: "Order Custom",
    trustStrip: [
      { label: "Fast Delivery" },
      { label: "Clean Code" },
      { label: "Production Ready" },
      { label: "Fully Responsive" },
      { label: "SEO Optimized" },
      { label: "Secure & Scalable" },
      { label: "Mobile First" },
      { label: "Modern Stack" },
    ],
    processSteps: [
      {
        icon: "MessageSquare",
        headline: "Tell Me What You Need",
        description:
          "Describe your project idea through our AI-guided conversation. No lengthy forms — just a natural chat.",
      },
      {
        icon: "Zap",
        headline: "Get an Instant Estimate",
        description:
          "Receive a transparent price and timeline estimate immediately, based on your specific requirements.",
      },
      {
        icon: "Code2",
        headline: "I Build It",
        description:
          "Your project is built with a modern stack, clean architecture, and attention to every detail.",
      },
      {
        icon: "Rocket",
        headline: "Delivered & Deployed",
        description:
          "Receive your GitHub repository, full documentation, and deployment assistance to go live.",
      },
    ],
    aboutText:
      "I build production-ready websites that perform, convert, and scale. Every project ships with clean code, full documentation, and the confidence that it was built to last.",
    footerTagline: "Premium websites, built with care.",
    finalCtaHeadline: "Ready to launch something great?",
    finalCtaSubheadline: "Browse production-ready websites or order a custom build tailored to your needs.",
    footerLinks: [
      { label: "Showroom", href: "/showroom" },
      { label: "Order Custom", href: "/order" },
      { label: "Process", href: "/process" },
      { label: "Pricing", href: "/pricing" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },

  ai: {
    orderFlowQuestions: [
      {
        id: "industry",
        text: "What industry or type of business is this website for?",
        type: "text",
        sortOrder: 1,
      },
      {
        id: "features",
        text: "What key features do you need? (e.g. booking system, e-commerce, contact forms, blog)",
        type: "text",
        sortOrder: 2,
      },
      {
        id: "style",
        text: "How would you describe the visual style you're after? (e.g. minimal, bold, corporate, playful)",
        type: "text",
        sortOrder: 3,
      },
      {
        id: "budget",
        text: "Do you have a rough budget in mind, or would you like me to suggest pricing based on the scope?",
        type: "text",
        sortOrder: 4,
      },
      {
        id: "deadline",
        text: "Is there a deadline or launch date you're working toward?",
        type: "text",
        sortOrder: 5,
      },
    ],
    chatbotKnowledgeBase: "",
    pricingLogic: `PRICING TIERS (all prices in USD):

STARTER ($29 – $79):
- Single landing page or simple 1–2 page site
- Portfolio, personal bio, event page, coming soon
- No backend, no auth, no database
- One contact form
- Timeline: 1–3 days

BASIC ($79 – $199):
- 3–5 page business website
- Restaurant, salon, local shop, freelancer site
- Contact form, Google Maps embed, image gallery
- Mobile responsive, basic SEO
- Timeline: 3–7 days

STANDARD ($199 – $499):
- 5–10 page professional website
- Blog with CMS, service listings, team page
- Simple booking or inquiry form
- Social media integration, newsletter signup
- Timeline: 1–2 weeks

PROFESSIONAL ($499 – $999):
- Full business website with user auth
- Appointment booking system, client dashboard
- Payment integration for single service/product
- Admin panel, email notifications
- Timeline: 2–3 weeks

ADVANCED ($999 – $1,999):
- E-commerce store (up to 50 products)
- Multi-role auth, order management, inventory
- Custom API integrations, third-party services
- Analytics dashboard, automated emails
- Timeline: 3–5 weeks

ENTERPRISE ($1,999 – $4,999):
- Large marketplace or SaaS platform
- Multi-vendor, complex business logic
- Real-time features, custom payment flows
- Mobile-ready API backend, complex integrations
- Timeline: 1–3 months

IMPORTANT RULES:
- Always give a specific tight range (e.g. $199–$499), never vague wide ranges
- These are VERY competitive prices — emphasize the value and quality
- Factor in number of pages, features, auth requirements, integrations
- Bangladesh/local clients: mention BDT equivalent at 110 BDT per USD (e.g. $199 = ~21,890 BDT)
- If client has a tight budget, find a tier that fits and explain exactly what they get
- Always be enthusiastic — these prices are accessible for everyone
- Never suggest the price is too low — this is intentionally affordable premium quality`,
    recommenderPrompt: "",
  },

  communication: {
    chatEnabled: true,
    whatsappEnabled: false,
    emailEnabled: true,
    whatsappNumber: "",
    statusMessage: "Online",
    responseTime: "~2 hours",
  },

  devforge: {
    apiKey: "",
    apiUrl: "",
    enabled: false,
  },

  payments: {
    stripeEnabled: true,
    bkashEnabled: false,
    nagadEnabled: false,
    bkashNumber: "",
    nagadNumber: "",
    usdToBdtRate: 110,
  },

  platform: {
    name: "Zymbiq" as string,
    domain: "zymbiq.com",
    supportEmail: "hello@zymbiq.com",
    socialLinks: {} as Record<string, string>,
  },
} satisfies Record<string, unknown>;

export type DefaultSiteConfig = typeof DEFAULT_SITE_CONFIG;

// ---------------------------------------------------------------------------
// Misc UI Constants
// ---------------------------------------------------------------------------

export const MAX_COMPARISON_PROJECTS = 3;
export const PROJECT_PAGE_SIZE = 12;
export const BLOG_PAGE_SIZE = 9;
export const DEVFORGE_POLL_INTERVAL_MS = 60_000;
export const SITE_CONFIG_STALE_TIME_MS = 30 * 1000;
export const PROJECT_STALE_TIME_MS = 60 * 1000;
export const ORDER_STALE_TIME_MS = 30 * 1000;
export const BLOG_STALE_TIME_MS = 2 * 60 * 1000;
export const PAYMENT_POLL_INTERVAL_MS = 30_000;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CLOUDINARY_FOLDERS = {
  PROJECTS: "zymbiq/projects",
  BLOG: "zymbiq/blog",
  GENERAL: "zymbiq/general",
} as const;

export type CloudinaryFolder =
  (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const LUCIDE_ICON_MAP_KEYS = [
  "MessageSquare",
  "Zap",
  "Code2",
  "Rocket",
  "Globe",
  "ShieldCheck",
  "BarChart2",
  "Layers",
  "Settings",
  "Star",
  "CircleDot",
] as const;

export type LucideIconKey = (typeof LUCIDE_ICON_MAP_KEYS)[number];