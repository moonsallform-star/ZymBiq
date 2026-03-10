// =============================================================================
// Zymbiq — src/app/(admin)/admin/blog/page.tsx
// Admin blog manager: post list + create/edit form with TiptapEditor.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminBlogClient from "./_components/admin-blog-client";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      readTime: true,
      isPublished: true,
      seoTitle: true,
      seoDescription: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Serialize dates to strings for client component
  const serializedPosts = posts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Blog Manager
        </h1>
        <p className="text-sm text-muted mt-1">
          Create, edit, and publish blog posts.
        </p>
      </div>

      <AdminBlogClient initialPosts={serializedPosts} />
    </div>
  );
}