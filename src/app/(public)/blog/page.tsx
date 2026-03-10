// Zymbiq — src/app/(public)/blog/page.tsx
// Blog listing page — ISR Server Component with paginated published posts grid.

import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import BlogCard from '@/components/blog/blog-card';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ISR — revalidate every 60 seconds
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Blog — Zymbiq',
  description: 'Insights, tutorials, and updates from the Zymbiq developer.',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 9;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface BlogPageProps {
  searchParams: { page?: string };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        readTime: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.blogPost.count({ where: { isPublished: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Page heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-heading font-bold tracking-tight text-foreground">
            Blog
          </h1>
          <p className="mt-3 text-muted text-lg">
            Insights, tutorials, and updates.
          </p>
        </div>

        {/* Empty state */}
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-2xl font-semibold text-foreground mb-2">
              No posts yet
            </p>
            <p className="text-muted text-sm max-w-xs">
              Check back soon — articles and updates are on the way.
            </p>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav
                className="mt-16 flex items-center justify-center gap-4"
                aria-label="Blog pagination"
              >
                <PaginationLink
                  href={`/blog?page=${page - 1}`}
                  disabled={!hasPrev}
                  label="← Previous"
                />

                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>

                <PaginationLink
                  href={`/blog?page=${page + 1}`}
                  disabled={!hasNext}
                  label="Next →"
                />
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Pagination link helper
// ---------------------------------------------------------------------------

function PaginationLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-4 py-2 rounded-[--zymbiq-radius] text-sm font-medium',
          'border border-border text-muted cursor-not-allowed select-none'
        )}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center px-4 py-2 rounded-[--zymbiq-radius] text-sm font-medium',
        'border border-border text-foreground hover:bg-primary/5 transition-colors'
      )}
    >
      {label}
    </Link>
  );
}