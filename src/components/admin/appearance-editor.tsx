// src/components/admin/appearance-editor.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, RefreshCw, Eye, Save, Loader2, ImageIcon, X } from 'lucide-react';

import { AppearanceSchema, type AppearanceInput } from '@/lib/validations';
import { useSiteConfig } from '@/hooks/use-site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { QUERY_KEYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'Space Grotesk',
  'DM Sans',
  'Outfit',
  'Plus Jakarta Sans',
  'Manrope',
  'Geist',
  'Lato',
  'Poppins',
  'Raleway',
  'Merriweather',
  'Source Serif 4',
  'Fraunces',
] as const;

const SPACING_SCALE_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'Tighter spacing' },
  { value: 'default', label: 'Default', description: 'Balanced spacing' },
  { value: 'relaxed', label: 'Relaxed', description: 'Generous spacing' },
] as const;

const BORDER_RADIUS_OPTIONS = [
  { value: 'sharp', label: 'Sharp', preview: 'rounded-none' },
  { value: 'soft', label: 'Soft', preview: 'rounded-sm' },
  { value: 'rounded', label: 'Rounded', preview: 'rounded-md' },
  { value: 'pill', label: 'Pill', preview: 'rounded-full' },
] as const;

const COLOR_FIELDS = [
  { key: 'primaryColor', label: 'Primary', description: 'Main brand color' },
  { key: 'secondaryColor', label: 'Secondary', description: 'Supporting color' },
  { key: 'accentColor', label: 'Accent', description: 'Highlight / CTA color' },
  { key: 'backgroundColor', label: 'Background', description: 'Page background' },
  { key: 'textColor', label: 'Text', description: 'Primary text color' },
  { key: 'mutedColor', label: 'Muted', description: 'Secondary text & borders' },
] as const;

type ColorFieldKey = (typeof COLOR_FIELDS)[number]['key'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ColorPickerRowProps {
  fieldKey: ColorFieldKey;
  label: string;
  description: string;
  value: string;
  error?: string;
  onChange: (val: string) => void;
}

function ColorPickerRow({
  fieldKey,
  label,
  description,
  value,
  error,
  onChange,
}: ColorPickerRowProps) {
  const [hexInput, setHexInput] = useState(value);

  // Keep local hex in sync when parent value changes (e.g. reset)
  useEffect(() => {
    setHexInput(value);
  }, [value]);

  function handleColorInput(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value;
    onChange(hex);
    setHexInput(hex);
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setHexInput(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (isValidHex(normalized)) {
      onChange(normalized);
    }
  }

  function handleHexBlur() {
    const normalized = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (isValidHex(normalized)) {
      setHexInput(normalized);
      onChange(normalized);
    } else {
      // Revert to last valid value
      setHexInput(value);
    }
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      {/* Native color picker */}
      <label
        htmlFor={`color-native-${fieldKey}`}
        className="relative flex-shrink-0 cursor-pointer"
        title={`Pick ${label} color`}
      >
        <span
          className="block h-10 w-10 rounded-[--zymbiq-radius] border-2 border-border shadow-sm overflow-hidden"
          style={{ backgroundColor: isValidHex(value) ? value : '#ffffff' }}
        />
        <input
          id={`color-native-${fieldKey}`}
          type="color"
          value={isValidHex(value) ? value : '#ffffff'}
          onChange={handleColorInput}
          className="sr-only"
          aria-label={`${label} color picker`}
        />
      </label>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{description}</p>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>

      {/* Hex text input */}
      <Input
        value={hexInput}
        onChange={handleHexInput}
        onBlur={handleHexBlur}
        className="w-28 font-mono text-xs"
        maxLength={7}
        aria-label={`${label} hex value`}
        placeholder="#000000"
      />
    </div>
  );
}

interface UploadFieldProps {
  label: string;
  currentUrl?: string;
  folder: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  accept?: string;
}

function UploadField({
  label,
  currentUrl,
  folder,
  onUploaded,
  onClear,
  accept = 'image/*',
}: UploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5MB');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Upload failed');
      }
      const json = (await res.json()) as { data?: { url?: string } };
      const url = json.data?.url;
      if (url) onUploaded(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="flex-shrink-0 h-12 w-12 rounded-[--zymbiq-radius] border border-border bg-surface flex items-center justify-center overflow-hidden">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={label}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>

            {currentUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClear}
                aria-label={`Remove ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-red-500">{uploadError}</p>
          )}
          {currentUrl && (
            <p className="text-xs text-muted truncate" title={currentUrl}>
              {currentUrl.split('/').pop()}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileChange}
        aria-label={`${label} file input`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AppearanceEditor() {
  const { data: siteConfig } = useSiteConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const defaultValues: AppearanceInput = {
    primaryColor: siteConfig.appearance.primaryColor,
    secondaryColor: siteConfig.appearance.secondaryColor,
    accentColor: siteConfig.appearance.accentColor,
    backgroundColor: siteConfig.appearance.backgroundColor,
    textColor: siteConfig.appearance.textColor,
    mutedColor: siteConfig.appearance.mutedColor,
    headingFont: siteConfig.appearance.headingFont,
    bodyFont: siteConfig.appearance.bodyFont,
    spacingScale: siteConfig.appearance.spacingScale,
    borderRadius: siteConfig.appearance.borderRadius,
    darkMode: siteConfig.appearance.darkMode,
    logoUrl: siteConfig.appearance.logoUrl ?? '',
    faviconUrl: siteConfig.appearance.faviconUrl ?? '',
  };

  const isSavingRef = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<AppearanceInput>({
    resolver: zodResolver(AppearanceSchema),
    defaultValues,
  });

  // Reset defaults when siteConfig loads — but not while a save is in flight.
  // isSavingRef is set true before mutation fires and false in onSettled,
  // preventing the reset from overwriting form state mid-save.
  useEffect(() => {
    if (isSavingRef.current) return;
    reset({
      primaryColor: siteConfig.appearance.primaryColor,
      secondaryColor: siteConfig.appearance.secondaryColor,
      accentColor: siteConfig.appearance.accentColor,
      backgroundColor: siteConfig.appearance.backgroundColor,
      textColor: siteConfig.appearance.textColor,
      mutedColor: siteConfig.appearance.mutedColor,
      headingFont: siteConfig.appearance.headingFont,
      bodyFont: siteConfig.appearance.bodyFont,
      spacingScale: siteConfig.appearance.spacingScale,
      borderRadius: siteConfig.appearance.borderRadius,
      darkMode: siteConfig.appearance.darkMode,
      logoUrl: siteConfig.appearance.logoUrl ?? '',
      faviconUrl: siteConfig.appearance.faviconUrl ?? '',
    });
  }, [siteConfig.appearance, reset]);

  // Live preview: send pending CSS vars to iframe via postMessage on every change
  const watchedValues = watch();
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: 'ZYMBIQ_PREVIEW', appearance: watchedValues },
        '*'
      );
    } catch {
      // Iframe may not be ready yet — silently ignore
    }
  }, [watchedValues]);

  // ---------------------------------------------------------------------------
  // Save mutation
  // ---------------------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async (data: AppearanceInput) => {
      const res = await fetch('/api/admin/appearance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? 'Failed to save appearance');
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.siteConfig() });
      void queryClient.refetchQueries({ queryKey: QUERY_KEYS.siteConfig() });
      toast({
        title: 'Appearance saved',
        description: 'Your changes are now live.',
        variant: 'default',
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      isSavingRef.current = false;
    },
  });

  const onSubmit = handleSubmit((data) => {
    isSavingRef.current = true;
    saveMutation.mutate(data);
  });

  // ---------------------------------------------------------------------------
  // Reset iframe on load so it picks up current postMessage
  // ---------------------------------------------------------------------------

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: 'ZYMBIQ_PREVIEW', appearance: watchedValues },
        '*'
      );
    } catch {
      // noop
    }
  }, [watchedValues]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-0" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Top action bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
        <div>
          <h2 className="text-base font-semibold text-foreground">Appearance</h2>
          <p className="text-xs text-muted mt-0.5">
            Changes are reflected live in the preview pane.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset(defaultValues)}
            disabled={!isDirty || saveMutation.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ------------------------------------------------------------------ */}
        {/* Left panel — controls                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 overflow-y-auto min-h-0 border-r border-border">
          <div className="divide-y divide-border">

            {/* ---- Colors ---- */}
            <section className="px-6 py-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Colors</h3>
              <p className="text-xs text-muted mb-4">
                All colors apply globally via CSS custom properties.
              </p>
              <div>
                {COLOR_FIELDS.map(({ key, label, description }) => (
                  <Controller
                    key={key}
                    name={key as ColorFieldKey}
                    control={control}
                    render={({ field }) => (
                      <ColorPickerRow
                        fieldKey={key as ColorFieldKey}
                        label={label}
                        description={description}
                        value={field.value}
                        error={errors[key as ColorFieldKey]?.message}
                        onChange={field.onChange}
                      />
                    )}
                  />
                ))}
              </div>
            </section>

            {/* ---- Typography ---- */}
            <section className="px-6 py-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Typography</h3>
                <p className="text-xs text-muted">
                  Fonts are loaded from Google Fonts on save.
                </p>
              </div>

              <div className="space-y-3">
                {/* Heading font */}
                <div className="space-y-1.5">
                  <Label htmlFor="headingFont">Heading Font</Label>
                  <Controller
                    name="headingFont"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="headingFont">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOOGLE_FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font}>
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.headingFont && (
                    <p className="text-xs text-red-500">{errors.headingFont.message}</p>
                  )}
                </div>

                {/* Body font */}
                <div className="space-y-1.5">
                  <Label htmlFor="bodyFont">Body Font</Label>
                  <Controller
                    name="bodyFont"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="bodyFont">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOOGLE_FONT_OPTIONS.map((font) => (
                            <SelectItem key={font} value={font}>
                              <span style={{ fontFamily: font }}>{font}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bodyFont && (
                    <p className="text-xs text-red-500">{errors.bodyFont.message}</p>
                  )}
                </div>
              </div>
            </section>

            {/* ---- Spacing Scale ---- */}
            <section className="px-6 py-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Spacing</h3>
                <p className="text-xs text-muted">Controls section and component padding.</p>
              </div>
              <Controller
                name="spacingScale"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {SPACING_SCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex-1 rounded-[--zymbiq-radius] border p-3 text-left transition-colors',
                          field.value === opt.value
                            ? 'border-accent bg-accent/5 text-accent'
                            : 'border-border bg-surface text-foreground hover:border-accent/50'
                        )}
                      >
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-muted mt-0.5">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.spacingScale && (
                <p className="text-xs text-red-500">{errors.spacingScale.message}</p>
              )}
            </section>

            {/* ---- Border Radius ---- */}
            <section className="px-6 py-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Corner Style</h3>
                <p className="text-xs text-muted">Applied to buttons, cards, and inputs.</p>
              </div>
              <Controller
                name="borderRadius"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {BORDER_RADIUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-md border p-3 transition-colors',
                          field.value === opt.value
                            ? 'border-accent bg-accent/5'
                            : 'border-border bg-surface hover:border-accent/50'
                        )}
                      >
                        {/* Preview box */}
                        <span
                          className={cn(
                            'block h-8 w-8 bg-accent/20 border-2 border-accent/40',
                            opt.preview
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            field.value === opt.value ? 'text-accent' : 'text-foreground'
                          )}
                        >
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.borderRadius && (
                <p className="text-xs text-red-500">{errors.borderRadius.message}</p>
              )}
            </section>

            {/* ---- Dark Mode ---- */}
            <section className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Default Dark Mode</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Sets the default theme for all visitors.
                  </p>
                </div>
                <Controller
                  name="darkMode"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Toggle dark mode default"
                    />
                  )}
                />
              </div>
            </section>

            {/* ---- Logo & Favicon ---- */}
            <section className="px-6 py-5 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Branding</h3>
                <p className="text-xs text-muted">Upload logo (PNG/SVG) and favicon (ICO/PNG).</p>
              </div>

              <Controller
                name="logoUrl"
                control={control}
                render={({ field }) => (
                  <UploadField
                    label="Logo"
                    currentUrl={field.value}
                    folder="zymbiq/general"
                    onUploaded={(url) => {
                      field.onChange(url);
                      setValue('logoUrl', url, { shouldDirty: true });
                    }}
                    onClear={() => field.onChange('')}
                    accept="image/png,image/svg+xml,image/webp"
                  />
                )}
              />

              <Controller
                name="faviconUrl"
                control={control}
                render={({ field }) => (
                  <UploadField
                    label="Favicon"
                    currentUrl={field.value}
                    folder="zymbiq/general"
                    onUploaded={(url) => {
                      field.onChange(url);
                      setValue('faviconUrl', url, { shouldDirty: true });
                    }}
                    onClear={() => field.onChange('')}
                    accept="image/x-icon,image/png,image/svg+xml"
                  />
                )}
              />
            </section>

          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Right panel — live preview iframe                                   */}
        {/* ------------------------------------------------------------------ */}
        <div className="hidden lg:flex flex-1 flex-col min-h-0 bg-muted/5">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface">
            <Eye className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted font-medium">Live Preview</span>
            <span className="ml-auto text-xs text-muted/60">
              Changes apply without saving
            </span>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full rounded-[--zymbiq-radius] border border-border overflow-hidden shadow-lg bg-surface">
              <iframe
                ref={iframeRef}
                src="/?preview=1"
                title="Appearance preview"
                className="w-full h-full"
                onLoad={handleIframeLoad}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}