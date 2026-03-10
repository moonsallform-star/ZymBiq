// =============================================================================
// Zymbiq — src/emails/manual-payment-confirmed.tsx
// React Email template confirming manual payment verification approval or rejection.
// =============================================================================

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// =============================================================================
// Props
// =============================================================================

export interface ManualPaymentConfirmedEmailProps {
  clientName: string;
  paymentMethod: "BKASH" | "NAGAD" | string;
  amountBdt: number;
  trackingCode: string;
  platformName: string;
  /** When true, renders a rejection notice instead of confirmation */
  rejected?: boolean;
  rejectionNote?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const METHOD_LABEL: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
};

function getMethodLabel(method: string): string {
  return METHOD_LABEL[method] ?? method;
}

// =============================================================================
// Component
// =============================================================================

export default function ManualPaymentConfirmedEmail({
  clientName,
  paymentMethod,
  amountBdt,
  trackingCode,
  platformName,
  rejected = false,
  rejectionNote,
}: ManualPaymentConfirmedEmailProps) {
  const methodLabel = getMethodLabel(paymentMethod);
  const formattedAmount = `${Math.round(amountBdt).toLocaleString("en-BD")} BDT`;
  const trackingUrl = `${process.env.NEXTAUTH_URL ?? "https://zymbiq.com"}/track/${trackingCode}`;

  const previewText = rejected
    ? `Payment verification update from ${platformName}`
    : `Your ${methodLabel} payment has been confirmed — your order is now active`;

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
            <Text style={styles.brandName}>{platformName}</Text>
          </Section>

          <Hr style={styles.divider} />

          {/* ---------------------------------------------------------------- */}
          {/* Status badge                                                      */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.badgeSection}>
            <div style={rejected ? styles.badgeRejected : styles.badgeSuccess}>
              <Text style={styles.badgeText}>
                {rejected ? "✗  Payment Not Verified" : "✓  Payment Confirmed"}
              </Text>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* Heading + greeting                                                */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.section}>
            <Heading as="h1" style={styles.heading}>
              {rejected ? "Payment Verification Update" : "Payment Confirmed ✓"}
            </Heading>

            <Text style={styles.bodyText}>Hi {clientName},</Text>

            {rejected ? (
              <>
                <Text style={styles.bodyText}>
                  Unfortunately we were unable to verify your{" "}
                  <strong>{methodLabel}</strong> payment of{" "}
                  <strong>{formattedAmount}</strong>.
                </Text>
                {rejectionNote && (
                  <Text style={styles.bodyText}>
                    <strong>Reason: </strong>
                    {rejectionNote}
                  </Text>
                )}
                <Text style={styles.bodyText}>
                  Please double-check your transaction ID and contact us via
                  chat or email so we can resolve this as quickly as possible.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bodyText}>
                  Great news! Your <strong>{methodLabel}</strong> payment of{" "}
                  <strong>{formattedAmount}</strong> has been confirmed. Your
                  order is now active and we will be in touch shortly to discuss
                  next steps.
                </Text>
              </>
            )}
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* Payment summary                                                   */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.detailsSection}>
            <Text style={styles.detailsHeading}>Payment Summary</Text>

            <table style={styles.detailsTable}>
              <tbody>
                <tr>
                  <td style={styles.detailsLabel}>Payment Method</td>
                  <td style={styles.detailsValue}>{methodLabel}</td>
                </tr>
                <tr>
                  <td style={styles.detailsLabel}>Amount</td>
                  <td style={styles.detailsValue}>{formattedAmount}</td>
                </tr>
                <tr>
                  <td style={styles.detailsLabel}>Order Reference</td>
                  <td style={styles.detailsValue}>
                    <span style={styles.mono}>{trackingCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style={styles.detailsLabel}>Status</td>
                  <td style={styles.detailsValue}>
                    <span
                      style={
                        rejected ? styles.statusRejected : styles.statusConfirmed
                      }
                    >
                      {rejected ? "Not Verified" : "Paid"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* ---------------------------------------------------------------- */}
          {/* CTA                                                               */}
          {/* ---------------------------------------------------------------- */}
          {!rejected && (
            <Section style={styles.ctaSection}>
              <Text style={styles.bodyText}>
                You can track the progress of your order at any time using the
                button below.
              </Text>
              <Button href={trackingUrl} style={styles.ctaButton}>
                Track Your Order
              </Button>
            </Section>
          )}

          {rejected && (
            <Section style={styles.ctaSection}>
              <Text style={styles.bodyText}>
                Need help? Reach out to us via the contact options on our
                website and we will sort this out for you.
              </Text>
            </Section>
          )}

          <Hr style={styles.divider} />

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                            */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              &copy; {new Date().getFullYear()} {platformName}. All rights
              reserved.
            </Text>
            <Text style={styles.footerText}>
              This email was sent because you placed an order on {platformName}.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// =============================================================================
// Inline styles — React Email requires inline styles throughout
// =============================================================================

const styles = {
  body: {
    backgroundColor: "#FAFAFA",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    margin: "0",
    padding: "0",
  } as React.CSSProperties,

  container: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    margin: "40px auto",
    maxWidth: "560px",
    padding: "0",
  } as React.CSSProperties,

  header: {
    padding: "28px 40px 20px",
  } as React.CSSProperties,

  brandName: {
    color: "#111827",
    fontSize: "20px",
    fontWeight: "700",
    letterSpacing: "-0.025em",
    margin: "0",
  } as React.CSSProperties,

  divider: {
    borderColor: "#E5E7EB",
    borderTopWidth: "1px",
    margin: "0",
  } as React.CSSProperties,

  badgeSection: {
    padding: "24px 40px 0",
  } as React.CSSProperties,

  badgeSuccess: {
    backgroundColor: "#ECFDF5",
    border: "1px solid #A7F3D0",
    borderRadius: "6px",
    display: "inline-block",
    padding: "8px 16px",
  } as React.CSSProperties,

  badgeRejected: {
    backgroundColor: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: "6px",
    display: "inline-block",
    padding: "8px 16px",
  } as React.CSSProperties,

  badgeText: {
    color: "#065F46",
    fontSize: "13px",
    fontWeight: "600",
    margin: "0",
  } as React.CSSProperties,

  section: {
    padding: "24px 40px",
  } as React.CSSProperties,

  heading: {
    color: "#111827",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "-0.025em",
    lineHeight: "1.3",
    margin: "0 0 20px",
  } as React.CSSProperties,

  bodyText: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "1.625",
    margin: "0 0 14px",
  } as React.CSSProperties,

  detailsSection: {
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
    borderTop: "1px solid #E5E7EB",
    padding: "24px 40px",
  } as React.CSSProperties,

  detailsHeading: {
    color: "#6B7280",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.08em",
    margin: "0 0 14px",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  detailsTable: {
    borderCollapse: "collapse" as const,
    width: "100%",
  } as React.CSSProperties,

  detailsLabel: {
    color: "#6B7280",
    fontSize: "13px",
    fontWeight: "500",
    paddingBottom: "10px",
    paddingRight: "16px",
    verticalAlign: "top" as const,
    width: "140px",
  } as React.CSSProperties,

  detailsValue: {
    color: "#111827",
    fontSize: "13px",
    fontWeight: "500",
    paddingBottom: "10px",
    verticalAlign: "top" as const,
  } as React.CSSProperties,

  mono: {
    backgroundColor: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "4px",
    color: "#111827",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "13px",
    letterSpacing: "0.05em",
    padding: "2px 6px",
  } as React.CSSProperties,

  statusConfirmed: {
    backgroundColor: "#ECFDF5",
    borderRadius: "4px",
    color: "#065F46",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 8px",
  } as React.CSSProperties,

  statusRejected: {
    backgroundColor: "#FEF2F2",
    borderRadius: "4px",
    color: "#991B1B",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 8px",
  } as React.CSSProperties,

  ctaSection: {
    padding: "24px 40px",
  } as React.CSSProperties,

  ctaButton: {
    backgroundColor: "#10B981",
    borderRadius: "6px",
    color: "#FFFFFF",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: "600",
    padding: "12px 28px",
    textDecoration: "none",
  } as React.CSSProperties,

  footer: {
    padding: "20px 40px 28px",
  } as React.CSSProperties,

  footerText: {
    color: "#9CA3AF",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 6px",
  } as React.CSSProperties,
} as const;