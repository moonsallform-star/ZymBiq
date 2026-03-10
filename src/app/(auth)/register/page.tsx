// Zymbiq — src/app/(auth)/register/page.tsx
// Registration page with name, email, password form, custom API endpoint, and auto sign-in.

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { RegisterSchema, type RegisterInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// API call — POST /api/auth/register
// ---------------------------------------------------------------------------

async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error ?? 'Registration failed. Please try again.');
    (err as Error & { status: number }).status = res.status;
    throw err;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // -------------------------------------------------------------------------
  // Registration mutation
  // -------------------------------------------------------------------------
  const mutation = useMutation({
    mutationFn: registerUser,
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409) {
        setError('email', { message: 'Email already registered.' });
      } else {
        setSubmitError(err.message);
      }
    },
    onSuccess: async (_data, variables) => {
      // Auto sign-in after successful registration
      const result = await signIn('credentials', {
        email: variables.email,
        password: variables.password,
        redirect: false,
      });

      if (!result || result.error) {
        // Registration succeeded but auto sign-in failed — send to login
        router.push('/login?registered=1');
        return;
      }

      router.push('/dashboard');
    },
  });

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------
  async function onSubmit(data: RegisterInput) {
    setSubmitError('');
    mutation.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  }

  const isPending = isSubmitting || mutation.isPending;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
            Create your account
          </p>
        </div>

        {/* ── Error banner ── */}
        {submitError && (
          <div
            role="alert"
            className={cn(
              'mb-5 px-4 py-3 rounded-[--zymbiq-radius]',
              'border border-destructive/40 bg-destructive/10',
              'text-sm text-destructive',
            )}
          >
            {submitError}
          </div>
        )}

        {/* ── Registration form ── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword ? 'confirm-password-error' : undefined
              }
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p
                id="confirm-password-error"
                className="text-xs text-destructive mt-1"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* ── Login link ── */}
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-accent hover:underline underline-offset-4 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}