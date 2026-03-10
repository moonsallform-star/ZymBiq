// Zymbiq — src/app/(auth)/login/page.tsx
// Credentials login page with React Hook Form, NextAuth signIn, and admin redirect.

'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { LoginSchema, type LoginInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Determine at module load time whether Google OAuth is configured.
// NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED is set to "true" in .env when
// GOOGLE_CLIENT_ID is present — this avoids exposing the actual client ID.
// ---------------------------------------------------------------------------
const GOOGLE_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

// ---------------------------------------------------------------------------
// Error message map for NextAuth error codes
// ---------------------------------------------------------------------------
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  OAuthSignin: 'Could not start Google sign-in. Please try again.',
  OAuthCallback: 'Google sign-in failed. Please try again.',
  OAuthAccountNotLinked:
    'This email is already registered with a different sign-in method.',
  Default: 'Something went wrong. Please try again.',
};

function getErrorMessage(code: string | null | undefined): string {
  if (!code) return '';
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnUrl = searchParams.get('returnUrl') ?? '/dashboard';
  const urlError = searchParams.get('error');

  const [submitError, setSubmitError] = useState<string>('');
  const [isGooglePending, setIsGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  // -------------------------------------------------------------------------
  // Credentials submit handler
  // -------------------------------------------------------------------------
  async function onSubmit(data: LoginInput) {
    setSubmitError('');

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (!result || result.error) {
      setSubmitError(
        result?.error === 'CredentialsSignin'
          ? 'Invalid email or password.'
          : 'Something went wrong. Please try again.',
      );
      return;
    }

    // Fetch updated session to determine role-based redirect destination.
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      if (session?.user?.isAdmin) {
        router.push('/admin');
      } else {
        router.push(returnUrl);
      }
    } catch {
      // Fallback: redirect to returnUrl if session fetch fails.
      router.push(returnUrl);
    }
  }

  // -------------------------------------------------------------------------
  // Google sign-in handler
  // -------------------------------------------------------------------------
  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    try {
      await signIn('google', { callbackUrl: returnUrl });
    } catch {
      setIsGooglePending(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derive the visible error: URL-level (from NextAuth redirect) takes
  // priority; then the local submit error.
  // -------------------------------------------------------------------------
  const visibleError = submitError || getErrorMessage(urlError);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 w-full">
      <div
        className={cn(
          'max-w-md w-full p-8',
          'bg-surface border border-border shadow-sm',
          'rounded-[--zymbiq-radius]',
        )}
      >
        {/* ── Logo / brand ── */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-heading font-semibold text-foreground tracking-tight hover:text-accent transition-colors"
          >
            Zymbiq
          </Link>
          <p className="mt-1 text-sm text-muted">
            Sign in to your account
          </p>
        </div>

        {/* ── Error banner ── */}
        {visibleError && (
          <div
            role="alert"
            className={cn(
              'mb-5 px-4 py-3 rounded-[--zymbiq-radius]',
              'border border-destructive/40 bg-destructive/10',
              'text-sm text-destructive',
            )}
          >
            {visibleError}
          </div>
        )}

        {/* ── Credentials form ── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/contact"
                className="text-xs text-muted hover:text-accent transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* ── Divider ── */}
        {GOOGLE_ENABLED && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-3 text-xs text-muted uppercase tracking-wide">
                  or
                </span>
              </div>
            </div>

            {/* Google sign-in */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isGooglePending}
              aria-busy={isGooglePending}
            >
              {isGooglePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  {/* Inline Google "G" mark — no external image dependency */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4 shrink-0"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </>
        )}

        {/* ── Register link ── */}
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-accent hover:underline underline-offset-4 transition-colors font-medium"
          >
            Create one
          </Link>
        </p>
</div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}