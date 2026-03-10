// =============================================================================
// Zymbiq — src/types/index.ts
// Typed interfaces for all parsed SiteConfig JSON values.
// Safe for use in both server and client components — no server-only imports.
// =============================================================================

// -----------------------------------------------------------------------------
// Sub-types used within SiteConfig interfaces
// -----------------------------------------------------------------------------

export interface TrustStripItem {
  label: string;
}

export interface ProcessStep {
  icon: string;
  headline: string;
  description: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface OrderFlowQuestion {
  id: string;
  text: string;
  type?: string;
  sortOrder: number;
}

// -----------------------------------------------------------------------------
// SiteConfig category interfaces
// -----------------------------------------------------------------------------

export interface SiteConfigAppearance {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  headingFont: string;
  bodyFont: string;
  spacingScale: string;
  borderRadius: string;
  darkMode: boolean;
  logoUrl?: string;
  faviconUrl?: string;
}

export interface SiteConfigLayout {
  heroEnabled: boolean;
  trustStripEnabled: boolean;
  carouselEnabled: boolean;
  statsEnabled: boolean;
  howItWorksEnabled: boolean;
  devforgeEnabled: boolean;
  testimonialsEnabled: boolean;
  finalCtaEnabled: boolean;
  sectionOrder: readonly string[];
  animationIntensity: 'subtle' | 'reduced' | 'off';
  gridStyle: string;
  cardStyle: string;
}

export interface SiteConfigContent {
  heroHeadline: string;
  heroSubheadline: string;
  heroCta1: string;
  heroCta2: string;
  trustStrip: TrustStripItem[];
  processSteps: ProcessStep[];
  aboutText: string;
  footerTagline: string;
  footerLinks: FooterLink[];
  finalCtaHeadline?: string;
  finalCtaSubheadline?: string;
}

export interface SiteConfigAI {
  orderFlowQuestions: OrderFlowQuestion[];
  chatbotKnowledgeBase: string;
  pricingLogic: string;
  recommenderPrompt: string;
}

export interface SiteConfigCommunication {
  chatEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  whatsappNumber: string;
  statusMessage: string;
  responseTime: string;
}

export interface SiteConfigPayments {
  stripeEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  bkashNumber: string;
  nagadNumber: string;
  usdToBdtRate: number;
}

export interface SiteConfigPlatform {
  name: string;
  domain: string;
  supportEmail: string;
  socialLinks: Record<string, string>;
}

export interface SiteConfigDevforge {
  apiKey: string;
  apiUrl: string;
  enabled: boolean;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Aggregate type combining all SiteConfig categories
// -----------------------------------------------------------------------------

export interface ParsedSiteConfig {
  appearance: SiteConfigAppearance;
  layout: SiteConfigLayout;
  content: SiteConfigContent;
  ai: SiteConfigAI;
  communication: SiteConfigCommunication;
  payments: SiteConfigPayments;
  platform: SiteConfigPlatform;
  devforge: SiteConfigDevforge;
}