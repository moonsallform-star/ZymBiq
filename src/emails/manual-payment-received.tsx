// =============================================================================
// Zymbiq — src/emails/manual-payment-received.tsx
// React Email template confirming manual payment submission receipt.
// =============================================================================

import {
  Body,
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

export interface ManualPaymentReceivedEmailProps {
  clientName: string;
  paymentMethod: "BKASH" | "NAGAD";
  transactionId: string;
  amountBdt: number;
  platformName: string;
  /** When true, renders an admin-facing copy with client email shown */
  isAdminCopy?: boolean;
  clientEmail?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const METHOD_LABEL: Record<"BKASH" | "NAGAD", string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
};

// =============================================================================
// Component
// =============================================================================

export default function ManualPaymentReceivedEmail({
  clientName,
  paymentMethod,
  transactionId,
  amountBdt,
  platformName,
  isAdminCopy = false,
  clientEmail,
}: ManualPaymentReceivedEmailProps) {
  const methodLabel = METHOD_LABEL[paymentMethod];
  const formattedAmount = `${Math.round(amountBdt).toLocaleString("en-BD")} BDT`;
  const previewText = isAdminCopy
    ? `New ${methodLabel} payment from ${clientName} — verify now`
    : `We received your ${methodLabel} payment — verification in progress`;

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
          {/* Heading                                                           */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.section}>
            <Heading as="h1" style={styles.heading}>
              Payment Submission Received
            </Heading>

            {/* Greeting */}
            <Text style={styles.body_text}>
              Hi {clientName},
            </Text>

            {isAdminCopy ? (
              <Text style={styles.body_text}>
                A new <strong>{methodLabel}</strong> payment has been submitted
                and is awaiting your verification.
                {clientEmail ? ` Client email: ${clientEmail}.` : ""}
              </Text>
            ) : (
              <Text style={styles.body_text}>
                We have received your <strong>{methodLabel}</strong> payment
                submission. Our team will verify it shortly.
              </Text>
            )}
          </Section>

          {/* ---------------------------------------------------------------- */}
          {/* Payment Details                                                   */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.detailsSection}>
            <Text style={styles.detailsHeading}>Payment Details</Text>

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
                  <td style={styles.detailsLabel}>Transaction ID</td>
                  <td style={styles.detailsValue}>
                    <span style={styles.mono}>{transactionId}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* ---------------------------------------------------------------- */}
          {/* Verification timeline message                                     */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.section}>
            {isAdminCopy ? (
              <Text style={styles.body_text}>
                Please log in to the admin panel and navigate to{" "}
                <strong>Payments → Manual Verification</strong> to confirm or
                reject this payment.
              </Text>
            ) : (
              <>
                <Text style={styles.body_text}>
                  Verification typically takes{" "}
                  <strong>1–2 hours during business hours</strong>. You will
                  receive a confirmation email as soon as your payment is
                  verified.
                </Text>
                <Text style={styles.body_text}>
                  If you have any questions in the meantime, please don&apos;t
                  hesitate to reach out via the chat or contact options on our
                  website.
                </Text>
              </>
            )}
          </Section>

          <Hr style={styles.divider} />

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                            */}
          {/* ---------------------------------------------------------------- */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              &copy; {new Date().getFullYear()} {platformName}. All rights
              reserved.
            </Text>
            {process.env.RESEND_FROM_EMAIL && (
              <Text style={styles.footerText}>
                Questions? Contact us at{" "}
                <a
                  href={`mailto:${process.env.RESEND_FROM_EMAIL}`}
                  style={styles.link}
                >
                  {process.env.RESEND_FROM_EMAIL}
                </a>
              </Text>
            )}
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

  section: {
    padding: "28px 40px",
  } as React.CSSProperties,

  heading: {
    color: "#111827",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "-0.025em",
    lineHeight: "1.3",
    margin: "0 0 20px",
  } as React.CSSProperties,

  body_text: {
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

  footer: {
    padding: "20px 40px 28px",
  } as React.CSSProperties,

  footerText: {
    color: "#9CA3AF",
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 6px",
  } as React.CSSProperties,

  link: {
    color: "#6366F1",
    textDecoration: "none",
  } as React.CSSProperties,
} as const;