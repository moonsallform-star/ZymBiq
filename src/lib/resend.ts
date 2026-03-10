// src/lib/resend.ts
import { Resend } from 'resend';
import type { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: ReactElement;
}

interface SendEmailResult {
  id: string;
}

async function sendEmail({ to, subject, react }: SendEmailParams): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      '[resend] RESEND_API_KEY is not set — skipping email send. Subject: "%s", To: %s',
      subject,
      Array.isArray(to) ? to.join(', ') : to
    );
    return { id: 'no-op' };
  }

  try {
    const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@zymbiq.com';

    const result = await resend.emails.send({
      from,
      to,
      subject,
      react,
    });

    if (result.error) {
      console.error('[resend] Email send error:', result.error);
      return { id: 'no-op' };
    }

    return { id: result.data?.id ?? 'unknown' };
  } catch (error) {
    console.error('[resend] Unexpected error sending email — subject: "%s"', subject, error);
    return { id: 'no-op' };
  }
}

export { resend, sendEmail };
export type { SendEmailParams, SendEmailResult };