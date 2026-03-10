// =============================================================================
// Zymbiq — src/app/(public)/contact/page.tsx
// Contact page rendering admin-configured contact option cards.
// =============================================================================

'use client';

import { Mail, MessageCircle, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSiteConfig } from '@/hooks/use-site-config';
import { useStore } from '@/store/index';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function ContactPage() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const openChat = useStore((s) => s.openChat);
  const setHubExpanded = useStore((s) => s.setHubExpanded);

  const { communication, platform } = siteConfig;
  const {
    chatEnabled,
    whatsappEnabled,
    emailEnabled,
    whatsappNumber,
    responseTime,
  } = communication;
  const { supportEmail } = platform;

  const hasAnyOption = chatEnabled || whatsappEnabled || emailEnabled;

  function handleOpenChat() {
    openChat();
    setHubExpanded(true);
  }

  return (
    <main className="min-h-screen py-24">
      <div className="container mx-auto max-w-2xl px-4 text-center">
        {/* Heading */}
        <h1 className="text-5xl font-heading font-semibold tracking-tight text-foreground">
          Get in Touch
        </h1>

        {/* Response time subheadline */}
        {responseTime && (
          <p className="mt-4 text-lg text-muted">
            {isLoading ? '\u00A0' : responseTime}
          </p>
        )}

        {/* Contact option cards */}
        <div className="mt-12 flex flex-col gap-4 md:flex-row md:justify-center">
          {hasAnyOption ? (
            <>
              {/* In-platform chat */}
              {chatEnabled && (
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenChat}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenChat();
                    }
                  }}
                  className="flex-1 cursor-pointer p-0 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <CardContent className="flex flex-col items-center gap-3 p-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <MessageCircle className="h-6 w-6" />
                    </span>
                    <span className="text-base font-medium text-foreground">
                      Start a Conversation
                    </span>
                    <span className="text-sm text-muted">
                      Chat with us directly on the platform
                    </span>
                  </CardContent>
                </Card>
              )}

              {/* WhatsApp */}
              {whatsappEnabled && whatsappNumber && (
                <Card className="flex-1 p-0 transition-shadow hover:shadow-md">
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-[--zymbiq-radius]"
                  >
                    <CardContent className="flex flex-col items-center gap-3 p-8">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Phone className="h-6 w-6" />
                      </span>
                      <span className="text-base font-medium text-foreground">
                        WhatsApp
                      </span>
                      <span className="text-sm text-muted">
                        Message us on WhatsApp
                      </span>
                    </CardContent>
                  </a>
                </Card>
              )}

              {/* Email */}
              {emailEnabled && supportEmail && (
                <Card className="flex-1 p-0 transition-shadow hover:shadow-md">
                  <a
                    href={`mailto:${supportEmail}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-[--zymbiq-radius]"
                  >
                    <CardContent className="flex flex-col items-center gap-3 p-8">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Mail className="h-6 w-6" />
                      </span>
                      <span className="text-base font-medium text-foreground">
                        Email
                      </span>
                      <span className="text-sm text-muted">
                        {supportEmail}
                      </span>
                    </CardContent>
                  </a>
                </Card>
              )}
            </>
          ) : (
            <p className="text-muted text-base mt-4">
              Contact options are currently unavailable. Please try again later.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}