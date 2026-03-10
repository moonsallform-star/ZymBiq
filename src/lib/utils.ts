// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// Class merging
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD'
): string {
  if (amount === null || amount === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'BDT' ? 0 : 2,
    maximumFractionDigits: currency === 'BDT' ? 0 : 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = 'MMM d, yyyy'
): string {
  if (!date) return '—';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (except spaces/hyphens)
    .replace(/[\s]+/g, '-')          // spaces → hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

// ---------------------------------------------------------------------------
// Tracking code generation
// ---------------------------------------------------------------------------

const TRACKING_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateTrackingCode(): string {
  let result = '';
  const charsLength = TRACKING_CHARS.length;

  for (let i = 0; i < 8; i++) {
    result += TRACKING_CHARS.charAt(Math.floor(Math.random() * charsLength));
  }

  return result;
}

// ---------------------------------------------------------------------------
// String truncation
// ---------------------------------------------------------------------------

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '…';
}

// ---------------------------------------------------------------------------
// Initials extraction
// ---------------------------------------------------------------------------

export function getInitials(name: string): string {
  if (!name?.trim()) return '';

  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? '';

  return (first + second).toUpperCase();
}