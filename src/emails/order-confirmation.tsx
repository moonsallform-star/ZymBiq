// =============================================================================
// Zymbiq — src/emails/order-confirmation.tsx
// Order confirmation email sent to clients after order creation.
// React Email format — inline styles only, no className.
// =============================================================================

import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
  Preview,
} from "@react-email/components";

// =============================================================================
// Props
// =============================================================================

export interface OrderConfirmationEmailProps {
  clientName: string;
  orderType: "PREBUILT" | "CUSTOM";
  projectTitle?: string;
  trackingCode: string;
  platformName: string;
  supportEmail: string;
}

// =============================================================================
// Styles (inline — React Email requirement)
// =============================================================================

const styles = {
  body: {
    backgroundColor: "#FAFAFA",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: "0",
    padding: "0",
  } satisfies React.CSSProperties,

  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "40px 24px",
  } satisfies React.CSSProperties,

  header: {
    marginBottom: "32px",
  } satisfies React.CSSProperties,

  platformName: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    letterSpacing: "-0.025em",
    margin: "0 0 4px 0",
  } satisfies React.CSSProperties,

  accentUnderline: {
    width: "32px",
    height: "3px",
    backgroundColor: "#6366F1",
    borderRadius: "2px",
  } satisfies React.CSSProperties,

  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    letterSpacing: "-0.025em",
    margin: "0 0 16px 0",
    lineHeight: "1.25",
  } satisfies React.CSSProperties,

  paragraph: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.625",
    margin: "0 0 12px 0",
  } satisfies React.CSSProperties,

  summaryBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "20px 24px",
    margin: "24px 0",
  } satisfies React.CSSProperties,

  summaryLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "0 0 4px 0",
  } satisfies React.CSSProperties,

  summaryValue: {
    fontSize: "15px",
    color: "#111827",
    fontWeight: "500",
    margin: "0 0 16px 0",
    lineHeight: "1.4",
  } satisfies React.CSSProperties,

  trackingBox: {
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "12px 16px",
    margin: "0",
  } satisfies React.CSSProperties,

  trackingLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "0 0 4px 0",
  } satisfies React.CSSProperties,

  trackingCode: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    fontFamily: "'Courier New', Courier, monospace",
    letterSpacing: "0.1em",
    margin: "0",
  } satisfies React.CSSProperties,

  buttonContainer: {
    margin: "28px 0",
    textAlign: "left" as const,
  } satisfies React.CSSProperties,

  button: {
    backgroundColor: "#6366F1",
    color: "#FFFFFF",
    padding: "12px 24px",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: "600",
    textDecoration: "none",
    display: "inline-block",
  } satisfies React.CSSProperties,

  hr: {
    borderColor: "#E5E7EB",
    margin: "24px 0",
  } satisfies React.CSSProperties,

  footer: {
    fontSize: "14px",
    color: "#6B7280",
    lineHeight: "1.5",
    margin: "0",
  } satisfies React.CSSProperties,

  footerLink: {
    color: "#6366F1",
    textDecoration: "underline",
  } satisfies React.CSSProperties,
} as const;

// =============================================================================
// Component
// =============================================================================

export default function OrderConfirmationEmail({
  clientName,
  orderType,
  projectTitle,
  trackingCode,
  platformName,
  supportEmail,
}: OrderConfirmationEmailProps): React.ReactElement {
  const baseUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "https://zymbiq.com";

  const trackingUrl = `${baseUrl}/track/${trackingCode}`;

  const previewText =
    orderType === "PREBUILT"
      ? `Your order for ${projectTitle ?? "your project"} has been received — ${platformName}`
      : `Your custom development order has been received — ${platformName}`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* ---------------------------------------------------------------- */}
          {/* Header                                                            */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.header}>
            <Text style={styles.platformName}>{platformName}</Text>
            <div style={styles.accentUnderline} />
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* Heading                                                           */}
          {/* ---------------------------------------------------------------- */}
          <Heading as="h1" style={styles.heading}>
            Thank you for your order, {clientName}!
          </Heading>

          <Text style={styles.paragraph}>
            {orderType === "PREBUILT"
              ? "Your order has been received and we're preparing everything for delivery."
              : "Your custom development brief has been received. We'll review it shortly and be in touch to kick things off."}
          </Text>

          {/* ---------------------------------------------------------------- */}
          {/* Order summary box                                                 */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.summaryBox}>
            {/* Order type */}
            <Text style={styles.summaryLabel}>Order Type</Text>
            <Text style={styles.summaryValue}>
              {orderType === "PREBUILT"
                ? "Pre-built Website"
                : "Custom Development"}
            </Text>

            {/* Project title — only for PREBUILT */}
            {orderType === "PREBUILT" && projectTitle && (
              <>
                <Text style={styles.summaryLabel}>Project</Text>
                <Text style={styles.summaryValue}>{projectTitle}</Text>
              </>
            )}

            {/* Tracking code */}
            <div style={styles.trackingBox}>
              <Text style={styles.trackingLabel}>Tracking Code</Text>
              <Text style={styles.trackingCode}>{trackingCode}</Text>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* CTA button                                                        */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.buttonContainer}>
            <Button href={trackingUrl} style={styles.button}>
              Track Your Order
            </Button>
          </Section>

          <Text style={styles.paragraph}>
            You can also copy and paste this link into your browser:
            <br />
            <a href={trackingUrl} style={styles.footerLink}>
              {trackingUrl}
            </a>
          </Text>

          {/* ---------------------------------------------------------------- */}
          {/* Divider + footer                                                  */}
          {/* ---------------------------------------------------------------- */}
          <Hr style={styles.hr} />

          <Text style={styles.footer}>
            Questions? Reply to this email or contact{" "}
            <a href={`mailto:${supportEmail}`} style={styles.footerLink}>
              {supportEmail}
            </a>
            . We typically respond within a few hours.
          </Text>

          <Text style={{ ...styles.footer, marginTop: "12px" }}>
            — The {platformName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}