// Zymbiq — src/app/(public)/blog/[slug]/page.tsx
// Blog post detail page: ISR Server Component with full content, metadata, and related posts.

import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDate, truncate } from "@/lib/utils";
import BlogPostContent from "@/components/blog/blog-post-content";
import BlogCard from "@/components/blog/blog-card";
import { Badge } from "@/components/ui/badge";
import type { BlogPostSummary } from "@/types/database";

// ---------------------------------------------------------------------------
// ISR — revalidate every 60 seconds
// ---------------------------------------------------------------------------

export const revalidate = 60;

// ---------------------------------------------------------------------------
// Shared select shape for BlogPostSummary fields
// ---------------------------------------------------------------------------

const blogPostSummarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  readTime: true,
  publishedAt: true,
} as const;

// ---------------------------------------------------------------------------
// generateStaticParams — pre-build all published post slugs at build time
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });

  return posts.map((post) => ({ slug: post.slug }));
}

// ---------------------------------------------------------------------------
// generateMetadata — per-post SEO metadata with OG image
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug, isPublished: true },
    select: {
      title: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      coverImageUrl: true,
    },
  });

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? truncate(post.excerpt, 160),
    openGraph: post.coverImageUrl
      ? { images: [{ url: post.coverImageUrl }] }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  // Fetch post — isPublished: true ensures unpublished posts return notFound()
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug, isPublished: true },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      readTime: true,
      publishedAt: true,
      seoTitle: true,
      seoDescription: true,
    },
  });

  if (!post) {
    notFound();
  }

  // Fetch up to 3 related posts (most recent, excluding current)
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      isPublished: true,
      slug: { not: params.slug },
    },
    select: blogPostSummarySelect,
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <main className="py-16">
      <article className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Cover image */}
        {post.coverImageUrl && (
          <div className="overflow-hidden rounded-[--zymbiq-radius] mb-8">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              width={1200}
              height={675}
              priority
              className="aspect-video object-cover w-full"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight mt-8 mb-4">
          {post.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-10">
          <Badge variant="secondary">{post.readTime} min read</Badge>
          {post.publishedAt && (
            <span className="text-sm text-muted">
              {formatDate(post.publishedAt)}
            </span>
          )}
        </div>

        {/* Blog content */}
        <BlogPostContent content={post.content} />
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <h2 className="text-2xl font-semibold mb-8">More Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((related) => (
              <BlogCard
                key={related.id}
                post={related as BlogPostSummary}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}