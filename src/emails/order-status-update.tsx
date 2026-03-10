// =============================================================================
// Zymbiq — src/emails/order-status-update.tsx
// Order status update email sent to clients when their order phase changes.
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

export interface OrderStatusUpdateEmailProps {
  clientName: string;
  newStatus: string;
  orderType: "PREBUILT" | "CUSTOM";
  trackingCode: string;
  platformName: string;
}

// =============================================================================
// Status label map
// =============================================================================

const STATUS_LABELS: Record<string, string> = {
  NEW: "Received",
  IN_DISCUSSION: "In Discussion",
  BUILDING: "Being Built",
  REVIEW: "Under Review",
  DELIVERED: "Delivered!",
  CANCELLED: "Cancelled",
};

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

  statusBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    padding: "20px 24px",
    margin: "24px 0",
  } satisfies React.CSSProperties,

  statusLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    margin: "0 0 8px 0",
  } satisfies React.CSSProperties,

  statusValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#6366F1",
    letterSpacing: "-0.025em",
    margin: "0",
    lineHeight: "1.25",
  } satisfies React.CSSProperties,

  statusValueCancelled: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#EF4444",
    letterSpacing: "-0.025em",
    margin: "0",
    lineHeight: "1.25",
  } satisfies React.CSSProperties,

  statusValueDelivered: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: "-0.025em",
    margin: "0",
    lineHeight: "1.25",
  } satisfies React.CSSProperties,

  deliveredHighlight: {
    backgroundColor: "#ECFDF5",
    border: "1px solid #6EE7B7",
    borderRadius: "6px",
    padding: "16px 20px",
    margin: "16px 0 0 0",
  } satisfies React.CSSProperties,

  deliveredHighlightText: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#065F46",
    margin: "0",
    lineHeight: "1.5",
  } satisfies React.CSSProperties,

  trackingBox: {
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "12px 16px",
    margin: "16px 0 0 0",
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
// Helpers
// =============================================================================

function getStatusValueStyle(status: string): React.CSSProperties {
  if (status === "DELIVERED") return styles.statusValueDelivered;
  if (status === "CANCELLED") return styles.statusValueCancelled;
  return styles.statusValue;
}

function getContextMessage(
  status: string,
  orderType: "PREBUILT" | "CUSTOM"
): string {
  const projectLabel =
    orderType === "PREBUILT" ? "your project" : "your custom build";

  switch (status) {
    case "NEW":
      return `We've received your order and will be in touch shortly.`;
    case "IN_DISCUSSION":
      return `We're reviewing ${projectLabel} details and may reach out with a few questions.`;
    case "BUILDING":
      return `Great news — work has started on ${projectLabel}. We'll update you as it progresses.`;
    case "REVIEW":
      return `${orderType === "PREBUILT" ? "Your project" : "Your custom build"} is in final review. Almost there!`;
    case "DELIVERED":
      return `Your project is ready! Check your order tracker for access details and deliverables.`;
    case "CANCELLED":
      return `Your order has been cancelled. If you have questions, please reach out — we're happy to help.`;
    default:
      return `Your order status has been updated. Check your tracker for the latest details.`;
  }
}

// =============================================================================
// Component
// =============================================================================

export default function OrderStatusUpdateEmail({
  clientName,
  newStatus,
  orderType,
  trackingCode,
  platformName,
}: OrderStatusUpdateEmailProps): React.ReactElement {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "https://zymbiq.com";

  const trackingUrl = `${baseUrl}/track/${trackingCode}`;
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
  const isDelivered = newStatus === "DELIVERED";
  const isCancelled = newStatus === "CANCELLED";

  const previewText = isDelivered
    ? `Your project is ready! — ${platformName}`
    : `Order update: ${statusLabel} — ${platformName}`;

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
            {isDelivered
              ? `Your project is ready, ${clientName}!`
              : `Order Update`}
          </Heading>

          <Text style={styles.paragraph}>
            Hi {clientName},{" "}
            {isDelivered
              ? "we have exciting news."
              : "here's the latest on your order."}
          </Text>

          {/* ---------------------------------------------------------------- */}
          {/* Status box                                                        */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.statusBox}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={getStatusValueStyle(newStatus)}>{statusLabel}</Text>

            {/* Context message */}
            <Text
              style={{
                ...styles.paragraph,
                marginTop: "12px",
                marginBottom: "0",
              }}
            >
              {getContextMessage(newStatus, orderType)}
            </Text>

            {/* Delivered highlight */}
            {isDelivered && (
              <div style={styles.deliveredHighlight}>
                <Text style={styles.deliveredHighlightText}>
                  🎉 Check your order tracker for download links and delivery
                  details.
                </Text>
              </div>
            )}

            {/* Tracking code */}
            <div style={styles.trackingBox}>
              <Text style={styles.trackingLabel}>Tracking Code</Text>
              <Text style={styles.trackingCode}>{trackingCode}</Text>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* CTA button — hidden for CANCELLED                                */}
          {/* ---------------------------------------------------------------- */}
          {!isCancelled && (
            <Section style={styles.buttonContainer}>
              <Button href={trackingUrl} style={styles.button}>
                {isDelivered ? "View Deliverables" : "Track Your Order"}
              </Button>
            </Section>
          )}

          {isCancelled && (
            <Section style={styles.buttonContainer}>
              <Button href={`${baseUrl}/order`} style={styles.button}>
                Start a New Order
              </Button>
            </Section>
          )}

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
            Questions? Reply to this email or visit{" "}
            <a href={`${baseUrl}/contact`} style={styles.footerLink}>
              our contact page
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