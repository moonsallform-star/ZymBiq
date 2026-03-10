// src/components/blog/blog-card.tsx

import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { BlogPostSummary } from '@/types/database';

interface BlogCardProps {
  post: BlogPostSummary;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-surface border border-border rounded-[--zymbiq-radius] overflow-hidden hover:shadow-sm transition-shadow"
    >
      {/* Cover image */}
      {post.coverImageUrl ? (
        <div className="overflow-hidden">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            width={1200}
            height={675}
            className="aspect-video object-cover w-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-primary/10" />
      )}

      {/* Body */}
      <div className="p-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{post.readTime} min read</Badge>
          {post.publishedAt && (
            <span className="text-xs text-muted">
              {formatDate(post.publishedAt)}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-accent transition-colors">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="text-sm text-muted line-clamp-3 mt-2">{post.excerpt}</p>

        {/* Read more */}
        <span className="inline-block text-accent text-sm mt-3">
          Read More →
        </span>
      </div>
    </Link>
  );
}