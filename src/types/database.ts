// src/types/database.ts
// =============================================================================
// Zymbiq — Prisma result type extensions
// Provides strongly-typed shapes for common query results with relations.
// =============================================================================

import { Prisma, BlogPost } from '@prisma/client';

// =============================================================================
// PROJECT TYPES
// =============================================================================

/**
 * Project with its FAQs ordered by sortOrder ascending.
 * Used in: showroom grid, project detail page, featured carousel, similar projects.
 */
export type ProjectWithFaqs = Prisma.ProjectGetPayload<{
  include: {
    faqs: {
      orderBy: { sortOrder: 'asc' };
    };
  };
}>;

// =============================================================================
// ORDER TYPES
// =============================================================================

/**
 * Order with all relations needed for order detail views.
 * Used in: admin kanban, client dashboard, order tracker.
 */
export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    user: true;
    project: true;
    messages: {
      include: {
        user: {
          select: {
            name: true;
            email: true;
            image: true;
          };
        };
      };
      orderBy: { createdAt: 'asc' };
    };
    deliverables: true;
  };
}>;

/**
 * Full order — alias for OrderWithDetails, used when the name needs
 * to communicate completeness of the included relation set.
 */
export type FullOrder = OrderWithDetails;

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Message with minimal user info for display in chat threads.
 * Used in: admin messaging center, client dashboard messages, chat widget.
 */
export type MessageWithUser = Prisma.MessageGetPayload<{
  include: {
    user: {
      select: {
        name: true;
        email: true;
        image: true;
      };
    };
  };
}>;

// =============================================================================
// BLOG TYPES
// =============================================================================

/**
 * Minimal blog post shape for list views and cards.
 * Avoids loading full content string in list contexts.
 */
export type BlogPostSummary = Pick<
  BlogPost,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'coverImageUrl'
  | 'readTime'
  | 'publishedAt'
>;