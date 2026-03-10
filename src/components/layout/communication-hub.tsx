// =============================================================================
// Zymbiq — src/components/layout/communication-hub.tsx
// Fixed bottom-right floating communication hub with expandable options panel.
// =============================================================================

'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, MessageSquare, Phone, Mail, Loader2 } from 'lucide-react';
import { useStore } from '@/store/index';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ChatWidget is a heavy client component — load it only when needed.
const ChatWidget = dynamic(
  () => import('@/components/ai/chat-widget').then((m) => m.default),
  { ssr: false },
);

// -----------------------------------------------------------------------------
// Animation variants
// -----------------------------------------------------------------------------

const optionsPanelVariants = {
  hidden: {
    opacity: 0,
    y: 12,
    scale: 0.95,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  },
};

const optionItemVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.2, ease: [0, 0, 0.2, 1] },
  }),
};

const hubButtonVariants = {
  initial: { scale: 1 },
  tap: { scale: 0.93 },
};

// -----------------------------------------------------------------------------
// Option button shape
// -----------------------------------------------------------------------------

interface OptionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  index: number;
}

function OptionButton({ icon, label, onClick, index }: OptionButtonProps) {
  return (
    <motion.div
      custom={index}
      variants={optionItemVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-end gap-2"
    >
      {/* Label pill */}
      <span className="rounded-full text-xs font-medium px-3 py-1 shadow-sm whitespace-nowrap select-none border border-[var(--zymbiq-border)] text-[var(--zymbiq-text)]" style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 85%, transparent)', backdropFilter: 'blur(8px)' }}>
        {label}
      </span>

      {/* Icon button */}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full shadow-md',
          'bg-[var(--zymbiq-surface)] border border-[var(--zymbiq-border)] text-[var(--zymbiq-text)]',
          'hover:bg-[var(--zymbiq-accent)] hover:text-white hover:border-[var(--zymbiq-accent)]',
          'transition-colors duration-150 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--zymbiq-accent)] focus-visible:ring-offset-2',
        )}
      >
        {icon}
      </button>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function CommunicationHub() {
  const hubExpanded = useStore((s) => s.hubExpanded);
  const setHubExpanded = useStore((s) => s.setHubExpanded);
  const chatOpen = useStore((s) => s.chatOpen);
  const openChat = useStore((s) => s.openChat);
  const setChatTab = useStore((s) => s.setChatTab);
  const siteConfigLoaded = useStore((s) => s.siteConfigLoaded);

  const { data: siteConfig, isLoading } = useSiteConfig();
  const comm = siteConfig.communication;

  const anyOptionEnabled =
    comm.chatEnabled || comm.whatsappEnabled || comm.emailEnabled;

  // If config is loaded and no options are enabled, hide the hub entirely.
  if (siteConfigLoaded && !anyOptionEnabled) return null;

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function handleToggle() {
    setHubExpanded(!hubExpanded);
  }

  function handleChatClick() {
    openChat();
    setChatTab('platform');
    setHubExpanded(false);
  }

  function handleWhatsAppClick() {
    const number = comm.whatsappNumber?.replace(/\D/g, '') ?? '';
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
    setHubExpanded(false);
  }

  function handleEmailClick() {
    window.location.href = '/contact';
    setHubExpanded(false);
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Fixed container — above mobile nav on small screens */}
      <div
        className={cn(
          'fixed z-50 flex flex-col items-end gap-3',
          // On mobile: 80px from bottom to sit above the 60px mobile nav
          'bottom-20 right-4',
          // On desktop: closer to corner
          'md:bottom-6 md:right-6',
        )}
        aria-label="Communication hub"
      >
        {/* ── Option buttons panel ─────────────────────────────────────────── */}
        <AnimatePresence>
          {hubExpanded && (
            <motion.div
              key="options-panel"
              variants={optionsPanelVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col items-end gap-2"
            >
              {/* Status indicator */}
              {comm.statusMessage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.05 } }}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--zymbiq-border)] px-3 py-1 shadow-sm mb-1" style={{ backgroundColor: 'color-mix(in srgb, var(--zymbiq-bg) 85%, transparent)', backdropFilter: 'blur(8px)' }}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--zymbiq-success)] animate-pulse" />
                  <span className="text-xs text-muted select-none">
                    {comm.statusMessage}
                  </span>
                </motion.div>
              )}

              {/* In-platform chat */}
              {comm.chatEnabled && (
                <OptionButton
                  index={0}
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Chat with us"
                  onClick={handleChatClick}
                />
              )}

              {/* WhatsApp */}
              {comm.whatsappEnabled && (
                <OptionButton
                  index={1}
                  icon={<Phone className="h-4 w-4" />}
                  label="WhatsApp"
                  onClick={handleWhatsAppClick}
                />
              )}

              {/* Email / Contact */}
              {comm.emailEnabled && (
                <OptionButton
                  index={2}
                  icon={<Mail className="h-4 w-4" />}
                  label="Send email"
                  onClick={handleEmailClick}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hub trigger button ───────────────────────────────────────────── */}
        <motion.button
          type="button"
          aria-label={hubExpanded ? 'Close communication hub' : 'Open communication hub'}
          aria-expanded={hubExpanded}
          onClick={handleToggle}
          variants={hubButtonVariants}
          initial="initial"
          whileTap="tap"
          className={cn(
            'relative flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-lg',
            'text-white transition-all duration-150',
            'hover:scale-105',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          )}
          style={{ backgroundColor: 'var(--zymbiq-accent)', boxShadow: '0 0 18px 3px rgba(99,102,241,0.4)' }}
        >
          {/* Loading spinner while config fetches */}
          {isLoading && !siteConfigLoaded ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {hubExpanded ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1, transition: { duration: 0.15 } }}
                  exit={{ rotate: 90, opacity: 0, transition: { duration: 0.1 } }}
                  className="flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1, transition: { duration: 0.15 } }}
                  exit={{ rotate: -90, opacity: 0, transition: { duration: 0.1 } }}
                  className="flex items-center justify-center"
                >
                  <MessageCircle className="h-5 w-5" />
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </motion.button>
      </div>

      {/* ── Chat widget overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && <ChatWidget key="chat-widget" />}
      </AnimatePresence>
    </>
  );
}