// Zymbiq — src/app/(public)/not-found.tsx
// Branded 404 page with centered layout, navigation options, and optional 3D floating geometry.

import dynamic from 'next/dynamic'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — not-found-globe is intentionally optional; runtime .catch() handles absence
const TinyGlobe = dynamic(
  () =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — module is intentionally optional; missing at build time is handled by .catch()
    import(/* webpackIgnore: true */ '@/components/3d/not-found-globe').catch(
      () => ({ default: () => null })
    ),
  { ssr: false, loading: () => null }
)

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">

        {/* 3D Globe */}
        <div className="w-[160px] h-[160px] flex items-center justify-center">
          <TinyGlobe />
        </div>

        {/* 404 heading */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-8xl font-heading font-bold tracking-tight text-foreground leading-none">
            404
          </h1>
          <p className="text-xl text-muted">
            This page doesn&apos;t exist.
          </p>
        </div>

        {/* Navigation options */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Button asChild size="lg">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/showroom">Browse Showroom</Link>
          </Button>
        </div>

      </div>
    </main>
  )
}