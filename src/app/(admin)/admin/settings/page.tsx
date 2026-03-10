// =============================================================================
// Zymbiq — src/app/(admin)/admin/settings/page.tsx
// Admin settings page: platform, payments, communication, DevForge, social.
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { QUERY_KEYS, SITE_CONFIG_KEYS } from '@/lib/constants';
import type {
  SiteConfigPlatform,
  SiteConfigPayments,
  SiteConfigCommunication,
  SiteConfigDevforge,
} from '@/types/index';

// =============================================================================
// Types
// =============================================================================

type DevforgeTestState = 'idle' | 'testing' | 'success' | 'failed';

// =============================================================================
// Helper — PATCH /api/admin/site-config
// =============================================================================

async function patchSiteConfig(key: string, value: unknown): Promise<void> {
  const res = await fetch('/api/admin/site-config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to save ${key}`);
  }
}

// =============================================================================
// Sub-component — Section wrapper
// =============================================================================

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// Sub-component — Field row
// =============================================================================

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// =============================================================================
// Sub-component — Switch row
// =============================================================================

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted mt-0.5">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// =============================================================================
// Sub-component — Masked password input
// =============================================================================

function MaskedInput({
  id,
  value,
  onChange,
  placeholder,
  hasExistingValue,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasExistingValue: boolean;
}) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);

  // If there's an existing saved value and the user hasn't clicked to edit,
  // show the masked placeholder. Once they click "Change", show the real input.
  if (hasExistingValue && !editing && !value) {
    return (
      <div className="flex gap-2">
        <Input
          value="••••••••••••••••"
          readOnly
          className="flex-1 text-muted cursor-default"
          tabIndex={-1}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? 'Hide key' : 'Show key'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// =============================================================================
// Main page component
// =============================================================================

export default function AdminSettingsPage() {
  const { data: siteConfig, isLoading } = useSiteConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Platform state
  // ---------------------------------------------------------------------------
  const [platform, setPlatform] = useState<SiteConfigPlatform>({
    name: '',
    domain: '',
    supportEmail: '',
    socialLinks: {},
  });

  // ---------------------------------------------------------------------------
  // Payments state
  // ---------------------------------------------------------------------------
  const [payments, setPayments] = useState<SiteConfigPayments>({
    stripeEnabled: false,
    bkashEnabled: false,
    nagadEnabled: false,
    bkashNumber: '',
    nagadNumber: '',
    usdToBdtRate: 110,
  });

  // ---------------------------------------------------------------------------
  // Communication state
  // ---------------------------------------------------------------------------
  const [communication, setCommunication] = useState<SiteConfigCommunication>({
    chatEnabled: true,
    whatsappEnabled: false,
    emailEnabled: true,
    whatsappNumber: '',
    statusMessage: 'Online',
    responseTime: '~2 hours',
  });

  // ---------------------------------------------------------------------------
  // DevForge state
  // ---------------------------------------------------------------------------
  const [devforge, setDevforge] = useState<SiteConfigDevforge>({
    enabled: false,
    apiKey: '',
    apiUrl: '',
  });
  // Track whether there is a saved apiKey (to show masked placeholder)
  const [devforgeHasSavedKey, setDevforgeHasSavedKey] = useState(false);
  // Pending new key value (separate from devforge.apiKey which holds the saved state)
  const [devforgeNewKey, setDevforgeNewKey] = useState('');
  const [devforgeTestState, setDevforgeTestState] = useState<DevforgeTestState>('idle');
  const [devforgeSavedConfirmed, setDevforgeSavedConfirmed] = useState(false);

  // ---------------------------------------------------------------------------
  // Social links (part of platform)
  // ---------------------------------------------------------------------------
  const [socialLinks, setSocialLinks] = useState({
    twitter: '',
    github: '',
    linkedin: '',
  });

  // ---------------------------------------------------------------------------
  // Sync from siteConfig — runs whenever fresh server data arrives.
  // Uses a content-hash so it only updates state when the server data actually
  // changed, preventing overwrites of in-progress edits on unrelated refetches.
  // ---------------------------------------------------------------------------
  const lastSyncedHashRef = React.useRef<string>('');

  useEffect(() => {
    if (!siteConfig) return;

    const hash = JSON.stringify({
      platform: siteConfig.platform,
      payments: siteConfig.payments,
      communication: siteConfig.communication,
      devforge: {
        enabled: siteConfig.devforge.enabled,
        apiUrl: siteConfig.devforge.apiUrl,
        hasKey: typeof (siteConfig.devforge as Record<string, unknown>).apiKey === 'string' &&
          ((siteConfig.devforge as Record<string, unknown>).apiKey as string).length > 0,
      },
    });

    if (hash === lastSyncedHashRef.current) return;
    lastSyncedHashRef.current = hash;

    setPlatform(siteConfig.platform);
    setSocialLinks({
      twitter: (siteConfig.platform.socialLinks as Record<string, string>)?.twitter ?? '',
      github: (siteConfig.platform.socialLinks as Record<string, string>)?.github ?? '',
      linkedin: (siteConfig.platform.socialLinks as Record<string, string>)?.linkedin ?? '',
    });
    setPayments(siteConfig.payments);
    setCommunication(siteConfig.communication);
    setDevforge({
      enabled: siteConfig.devforge.enabled,
      apiKey: '',
      apiUrl: siteConfig.devforge.apiUrl,
    });
    const hasKey =
      (siteConfig.devforge as Record<string, unknown>).hasApiKey === true;
    setDevforgeHasSavedKey(hasKey);
    if (hasKey) setDevforgeSavedConfirmed(true);
  }, [siteConfig]);

  // ---------------------------------------------------------------------------
  // Mutations — each declared as a proper top-level hook call (Rules of Hooks)
  // ---------------------------------------------------------------------------
  const platformMutation = useMutation({
    mutationFn: (value: unknown) => patchSiteConfig(SITE_CONFIG_KEYS.PLATFORM, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Platform settings saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const paymentsMutation = useMutation({
    mutationFn: (value: unknown) => patchSiteConfig(SITE_CONFIG_KEYS.PAYMENTS, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Payment settings saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const communicationMutation = useMutation({
    mutationFn: (value: unknown) => patchSiteConfig(SITE_CONFIG_KEYS.COMMUNICATION, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'Communication settings saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  const devforgeMutation = useMutation({
    mutationFn: (value: unknown) => patchSiteConfig(SITE_CONFIG_KEYS.DEVFORGE, value),
    onSuccess: () => {
      if (devforgeNewKey.trim()) {
        setDevforgeHasSavedKey(true);
        setDevforgeSavedConfirmed(true);
        setDevforgeNewKey('');
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({ title: 'DevForge settings saved', variant: 'default' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  // ---------------------------------------------------------------------------
  // Save handlers
  // ---------------------------------------------------------------------------

  const savePlatform = useCallback(() => {
    platformMutation.mutate({ ...platform });
  }, [platform, platformMutation]);

  const savePayments = useCallback(() => {
    paymentsMutation.mutate({ ...payments });
  }, [payments, paymentsMutation]);

  const saveCommunication = useCallback(() => {
    communicationMutation.mutate({ ...communication });
  }, [communication, communicationMutation]);

  const saveDevforge = useCallback(() => {
    const payload: Record<string, unknown> = {
      enabled: devforge.enabled,
      apiUrl: devforge.apiUrl,
    };
    // Only include apiKey in payload when user has entered a new one
    if (devforgeNewKey.trim()) {
      payload.apiKey = devforgeNewKey.trim();
    }
    devforgeMutation.mutate(payload);
  }, [devforge, devforgeNewKey, devforgeMutation]);

  const saveSocialLinks = useCallback(() => {
    platformMutation.mutate({
      ...platform,
      socialLinks: { ...socialLinks },
    });
  }, [platform, socialLinks, platformMutation]);

  // ---------------------------------------------------------------------------
  // DevForge test connection
  // ---------------------------------------------------------------------------
  const testDevforgeConnection = useCallback(async () => {
    setDevforgeTestState('testing');
    try {
      const res = await fetch('/api/devforge/status');
      const body = (await res.json()) as { data: unknown };
      if (res.ok && body.data !== null) {
        setDevforgeTestState('success');
      } else {
        setDevforgeTestState('failed');
      }
    } catch {
      setDevforgeTestState('failed');
    }
    // Auto-reset after 4 seconds
    setTimeout(() => setDevforgeTestState('idle'), 4000);
  }, []);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-48 rounded-lg border border-border bg-surface animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Configure your platform, payments, integrations, and social presence.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Platform                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Platform"
        description="Basic information about your platform shown in emails, metadata, and the admin UI."
      >
        <div className="space-y-4">
          <Field label="Platform Name" htmlFor="platform-name">
            <Input
              id="platform-name"
              value={platform.name}
              onChange={(e) => setPlatform((p) => ({ ...p, name: e.target.value }))}
              placeholder="Zymbiq"
            />
          </Field>

          <Field label="Domain" htmlFor="platform-domain">
            <Input
              id="platform-domain"
              value={platform.domain}
              onChange={(e) => setPlatform((p) => ({ ...p, domain: e.target.value }))}
              placeholder="https://zymbiq.com"
            />
          </Field>

          <Field label="Support Email" htmlFor="platform-email">
            <Input
              id="platform-email"
              type="email"
              value={platform.supportEmail}
              onChange={(e) => setPlatform((p) => ({ ...p, supportEmail: e.target.value }))}
              placeholder="hello@zymbiq.com"
            />
          </Field>
        </div>

        <div className="pt-2">
          <Button
            onClick={savePlatform}
            disabled={platformMutation.isPending}
            size="sm"
          >
            {platformMutation.isPending && <Loader2 className="animate-spin" />}
            Save Platform Settings
          </Button>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Payments                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Payment Methods"
        description="Toggle which payment methods appear at checkout. Stripe handles USD automatically; bKash and Nagad require manual verification."
      >
        <div className="space-y-4">
          {/* Stripe */}
          <div className="space-y-3">
            <SwitchRow
              id="stripe-enabled"
              label="Stripe (USD)"
              description="Accept international card payments via Stripe."
              checked={payments.stripeEnabled}
              onCheckedChange={(v) => setPayments((p) => ({ ...p, stripeEnabled: v }))}
            />
            {payments.stripeEnabled && (
              <div className="ml-0 pl-4 border-l-2 border-border space-y-2">
                <p className="text-xs text-muted">
                  Stripe Publishable Key is set via{' '}
                  <code className="font-mono bg-muted/10 px-1 rounded">
                    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                  </code>{' '}
                  environment variable. Secret key and webhook secret are also in env — never stored here.
                </p>
              </div>
            )}
          </div>

          {/* bKash */}
          <div className="space-y-3 pt-2 border-t border-border">
            <SwitchRow
              id="bkash-enabled"
              label="bKash (BDT)"
              description="Accept manual bKash payments from Bangladeshi clients."
              checked={payments.bkashEnabled}
              onCheckedChange={(v) => setPayments((p) => ({ ...p, bkashEnabled: v }))}
            />
            {payments.bkashEnabled && (
              <div className="pl-4 border-l-2 border-border">
                <Field label="bKash Number" htmlFor="bkash-number">
                  <Input
                    id="bkash-number"
                    value={payments.bkashNumber}
                    onChange={(e) => setPayments((p) => ({ ...p, bkashNumber: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Nagad */}
          <div className="space-y-3 pt-2 border-t border-border">
            <SwitchRow
              id="nagad-enabled"
              label="Nagad (BDT)"
              description="Accept manual Nagad payments from Bangladeshi clients."
              checked={payments.nagadEnabled}
              onCheckedChange={(v) => setPayments((p) => ({ ...p, nagadEnabled: v }))}
            />
            {payments.nagadEnabled && (
              <div className="pl-4 border-l-2 border-border">
                <Field label="Nagad Number" htmlFor="nagad-number">
                  <Input
                    id="nagad-number"
                    value={payments.nagadNumber}
                    onChange={(e) => setPayments((p) => ({ ...p, nagadNumber: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Exchange rate */}
          <div className="pt-2 border-t border-border">
            <Field label="USD → BDT Exchange Rate" htmlFor="exchange-rate">
              <Input
                id="exchange-rate"
                type="number"
                min={1}
                step={0.01}
                value={payments.usdToBdtRate}
                onChange={(e) =>
                  setPayments((p) => ({
                    ...p,
                    usdToBdtRate: parseFloat(e.target.value) || 110,
                  }))
                }
                placeholder="110"
                className="max-w-[180px]"
              />
              <p className="text-xs text-muted mt-1">
                Used to calculate BDT amount shown to clients at checkout.
              </p>
            </Field>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={savePayments}
            disabled={paymentsMutation.isPending}
            size="sm"
          >
            {paymentsMutation.isPending && <Loader2 className="animate-spin" />}
            Save Payment Settings
          </Button>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Communication Hub                                                */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Communication Hub"
        description="Control which contact options appear in the floating hub on every page."
      >
        <div className="space-y-4">
          <SwitchRow
            id="chat-enabled"
            label="In-Platform Chat"
            description="Show the in-platform message thread option."
            checked={communication.chatEnabled}
            onCheckedChange={(v) => setCommunication((c) => ({ ...c, chatEnabled: v }))}
          />

          <div className="space-y-3 pt-2 border-t border-border">
            <SwitchRow
              id="whatsapp-enabled"
              label="WhatsApp"
              description="Show a WhatsApp direct-link button."
              checked={communication.whatsappEnabled}
              onCheckedChange={(v) => setCommunication((c) => ({ ...c, whatsappEnabled: v }))}
            />
            {communication.whatsappEnabled && (
              <div className="pl-4 border-l-2 border-border">
                <Field label="WhatsApp Number (with country code)" htmlFor="whatsapp-number">
                  <Input
                    id="whatsapp-number"
                    value={communication.whatsappNumber}
                    onChange={(e) =>
                      setCommunication((c) => ({ ...c, whatsappNumber: e.target.value }))
                    }
                    placeholder="+8801XXXXXXXXX"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <SwitchRow
              id="email-enabled"
              label="Email / Contact Page"
              description="Show an email button linking to the contact page."
              checked={communication.emailEnabled}
              onCheckedChange={(v) => setCommunication((c) => ({ ...c, emailEnabled: v }))}
            />
          </div>

          <div className="pt-2 border-t border-border grid grid-cols-2 gap-4">
            <Field label="Status Message" htmlFor="status-message">
              <Input
                id="status-message"
                value={communication.statusMessage}
                onChange={(e) =>
                  setCommunication((c) => ({ ...c, statusMessage: e.target.value }))
                }
                placeholder="Online"
              />
            </Field>
            <Field label="Response Time" htmlFor="response-time">
              <Input
                id="response-time"
                value={communication.responseTime}
                onChange={(e) =>
                  setCommunication((c) => ({ ...c, responseTime: e.target.value }))
                }
                placeholder="~2 hours"
              />
            </Field>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={saveCommunication}
            disabled={communicationMutation.isPending}
            size="sm"
          >
            {communicationMutation.isPending && <Loader2 className="animate-spin" />}
            Save Communication Settings
          </Button>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. DevForge Integration                                             */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="DevForge Integration"
        description="Connect DevForge to display live build activity on the homepage. API credentials are stored securely in the database."
      >
        <div className="space-y-4">
          <SwitchRow
            id="devforge-enabled"
            label="Enable DevForge"
            description="Show live build progress when an active project is detected."
            checked={devforge.enabled}
            onCheckedChange={(v) => setDevforge((d) => ({ ...d, enabled: v }))}
          />

          <Field label="DevForge API URL" htmlFor="devforge-url">
            <Input
              id="devforge-url"
              value={devforge.apiUrl}
              onChange={(e) => setDevforge((d) => ({ ...d, apiUrl: e.target.value }))}
              placeholder="https://api.devforge.example.com"
            />
          </Field>

          <Field label="DevForge API Key" htmlFor="devforge-key">
            <MaskedInput
              id="devforge-key"
              value={devforgeNewKey}
              onChange={setDevforgeNewKey}
              placeholder="Enter new API key…"
              hasExistingValue={devforgeHasSavedKey || devforgeSavedConfirmed}
            />
          </Field>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void testDevforgeConnection()}
              disabled={devforgeTestState === 'testing' || !devforge.apiUrl}
            >
              {devforgeTestState === 'testing' && (
                <Loader2 className="animate-spin" />
              )}
              Test Connection
            </Button>

            {devforgeTestState === 'success' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </span>
            )}
            {devforgeTestState === 'failed' && (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                Failed — check URL and key
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={saveDevforge}
            disabled={devforgeMutation.isPending}
            size="sm"
          >
            {devforgeMutation.isPending && <Loader2 className="animate-spin" />}
            Save DevForge Settings
          </Button>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Social Links                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Social Links"
        description="These links appear in the site footer and on the about page."
      >
        <div className="space-y-4">
          <Field label="Twitter / X" htmlFor="social-twitter">
            <Input
              id="social-twitter"
              value={socialLinks.twitter}
              onChange={(e) => setSocialLinks((s) => ({ ...s, twitter: e.target.value }))}
              placeholder="https://twitter.com/yourhandle"
            />
          </Field>

          <Field label="GitHub" htmlFor="social-github">
            <Input
              id="social-github"
              value={socialLinks.github}
              onChange={(e) => setSocialLinks((s) => ({ ...s, github: e.target.value }))}
              placeholder="https://github.com/yourhandle"
            />
          </Field>

          <Field label="LinkedIn" htmlFor="social-linkedin">
            <Input
              id="social-linkedin"
              value={socialLinks.linkedin}
              onChange={(e) => setSocialLinks((s) => ({ ...s, linkedin: e.target.value }))}
              placeholder="https://linkedin.com/in/yourhandle"
            />
          </Field>
        </div>

        <div className="pt-2">
          <Button
            onClick={saveSocialLinks}
            disabled={platformMutation.isPending}
            size="sm"
          >
            {platformMutation.isPending && <Loader2 className="animate-spin" />}
            Save Social Links
          </Button>
        </div>
      </Section>
    </div>
  );
}