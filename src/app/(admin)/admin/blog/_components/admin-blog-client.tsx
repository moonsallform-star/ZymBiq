// =============================================================================
// Zymbiq — src/app/(admin)/admin/blog/_components/admin-blog-client.tsx
// Client: post list + create/edit form with TiptapEditor, SEO fields, publish.
// =============================================================================

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  X,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { BlogPostSchema, type BlogPostInput } from "@/lib/validations";
import { slugify, formatDate, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Lazy-load TiptapEditor (heavy, browser-only)
// ---------------------------------------------------------------------------

const TiptapEditor = dynamic(
  () => import("@/components/admin/tiptap-editor"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SerializedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  readTime: number;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminBlogClientProps {
  initialPosts: SerializedPost[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminBlogClient({ initialPosts }: AdminBlogClientProps) {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [posts, setPosts] = React.useState<SerializedPost[]>(initialPosts);
  const [editingPost, setEditingPost] = React.useState<SerializedPost | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  // ── Form ───────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BlogPostInput>({
    resolver: zodResolver(BlogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImageUrl: "",
      readTime: 5,
      isPublished: false,
      seoTitle: "",
      seoDescription: "",
    },
  });

  const watchedTitle = watch("title");
  const watchedContent = watch("content");
  const watchedCoverImageUrl = watch("coverImageUrl");
  const watchedIsPublished = watch("isPublished");

  // ── Auto-slug from title (only when creating, not editing) ─────────────────
  const prevTitleRef = React.useRef("");
  React.useEffect(() => {
    if (editingPost) return; // Don't auto-slug when editing existing post
    if (watchedTitle === prevTitleRef.current) return;
    prevTitleRef.current = watchedTitle;
    setValue("slug", slugify(watchedTitle), { shouldValidate: false });
  }, [watchedTitle, editingPost, setValue]);

  // ── Open form for new post ─────────────────────────────────────────────────
  function handleNewPost() {
    setEditingPost(null);
    reset({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImageUrl: "",
      readTime: 5,
      isPublished: false,
      seoTitle: "",
      seoDescription: "",
    });
    prevTitleRef.current = "";
    setIsEditing(true);
  }

  // ── Open form for existing post ────────────────────────────────────────────
  function handleEditPost(post: SerializedPost) {
    setEditingPost(post);
    reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      readTime: post.readTime,
      isPublished: post.isPublished,
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
    });
    prevTitleRef.current = post.title;
    setIsEditing(true);
  }

  // ── Cancel editing ─────────────────────────────────────────────────────────
  function handleCancel() {
    setIsEditing(false);
    setEditingPost(null);
  }

  // ── Cover image upload ─────────────────────────────────────────────────────
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, WebP, or GIF.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5 MB.", variant: "destructive" });
      return;
    }

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "zymbiq/blog");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      const result = (await res.json()) as { data: { url: string } };
      setValue("coverImageUrl", result.data.url, { shouldValidate: true });
      toast({ title: "Cover image uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
    }
  }

  // ── Save / create post ─────────────────────────────────────────────────────
  const onSubmit = async (data: BlogPostInput) => {
    setIsSaving(true);
    try {
      const isUpdate = !!editingPost;
      const url = isUpdate ? `/api/blog/${editingPost.slug}` : "/api/blog";
      const method = isUpdate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        if (res.status === 409) {
          toast({
            title: "Slug already in use",
            description: "Please choose a different slug.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(err.error ?? "Failed to save post");
      }

      const result = (await res.json()) as { data: SerializedPost };
      const saved = result.data;

      // Serialize dates
      const serialized: SerializedPost = {
        ...saved,
        publishedAt: saved.publishedAt ?? null,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };

      if (isUpdate) {
        setPosts((prev) =>
          prev.map((p) => (p.id === serialized.id ? serialized : p))
        );
        toast({ title: "Post updated" });
      } else {
        setPosts((prev) => [serialized, ...prev]);
        toast({ title: "Post created" });
      }

      setIsEditing(false);
      setEditingPost(null);
    } catch (err) {
      toast({
        title: "Error saving post",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete post ────────────────────────────────────────────────────────────
  async function handleDelete(post: SerializedPost) {
    if (confirmDeleteId !== post.id) {
      setConfirmDeleteId(post.id);
      return;
    }

    setDeletingId(post.id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/blog/${post.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Delete failed");
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));

      // If we were editing this post, close the form
      if (editingPost?.id === post.id) {
        setIsEditing(false);
        setEditingPost(null);
      }
      toast({ title: "Post deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Dismiss delete confirm on outside interaction ──────────────────────────
  React.useEffect(() => {
    if (!confirmDeleteId) return;
    function handleClick() {
      setConfirmDeleteId(null);
    }
    window.addEventListener("click", handleClick, { once: true });
    return () => window.removeEventListener("click", handleClick);
  }, [confirmDeleteId]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-0">
      {/* ── Post list ── */}
      <aside className="xl:w-80 xl:flex-shrink-0 flex flex-col gap-3">
        <Button
          onClick={handleNewPost}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Button>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-[--zymbiq-radius]">
            <FileText className="h-8 w-8 text-muted mb-2" />
            <p className="text-sm text-muted">No posts yet.</p>
            <p className="text-xs text-muted mt-1">Click &quot;New Post&quot; to get started.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li
                key={post.id}
                className={cn(
                  "group border border-border rounded-[--zymbiq-radius] bg-surface p-3",
                  "transition-colors hover:border-accent/40",
                  editingPost?.id === post.id && "border-accent bg-accent/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant={post.isPublished ? "accent" : "muted"}
                        className="text-xs px-1.5 py-0"
                      >
                        {post.isPublished ? (
                          <><Eye className="h-2.5 w-2.5 mr-1" />Published</>
                        ) : (
                          <><EyeOff className="h-2.5 w-2.5 mr-1" />Draft</>
                        )}
                      </Badge>
                      {post.publishedAt && (
                        <span className="text-xs text-muted">
                          {formatDate(post.publishedAt, "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {post.isPublished && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center justify-center h-7 w-7 rounded-md",
                          "text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
                        )}
                        title="View post"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditPost(post)}
                      className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-md",
                        "text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
                      )}
                      title="Edit post"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(post);
                      }}
                      disabled={deletingId === post.id}
                      className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded-md",
                        "transition-colors",
                        confirmDeleteId === post.id
                          ? "text-destructive bg-destructive/10"
                          : "text-muted hover:text-destructive hover:bg-destructive/10"
                      )}
                      title={confirmDeleteId === post.id ? "Click again to confirm delete" : "Delete post"}
                    >
                      {deletingId === post.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : confirmDeleteId === post.id ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Editor form ── */}
      {isEditing ? (
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-medium text-foreground">
                {editingPost ? "Edit Post" : "New Post"}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {editingPost ? "Update Post" : "Create Post"}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Title + Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="blog-title">Title *</Label>
                  <Input
                    id="blog-title"
                    placeholder="My Awesome Post"
                    {...register("title")}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-slug">Slug *</Label>
                  <Input
                    id="blog-slug"
                    placeholder="my-awesome-post"
                    {...register("slug")}
                    aria-invalid={!!errors.slug}
                  />
                  {errors.slug && (
                    <p className="text-xs text-destructive">{errors.slug.message}</p>
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <Label htmlFor="blog-excerpt">Excerpt *</Label>
                <Textarea
                  id="blog-excerpt"
                  placeholder="A short summary of the post shown in listings…"
                  rows={3}
                  {...register("excerpt")}
                  aria-invalid={!!errors.excerpt}
                />
                {errors.excerpt && (
                  <p className="text-xs text-destructive">{errors.excerpt.message}</p>
                )}
              </div>

              {/* Cover image */}
              <div className="space-y-1.5">
                <Label>Cover Image</Label>
                <div className="flex items-start gap-3">
                  {watchedCoverImageUrl ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={watchedCoverImageUrl}
                        alt="Cover preview"
                        className="h-20 w-36 object-cover rounded-[--zymbiq-radius] border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setValue("coverImageUrl", "")}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        title="Remove cover image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                    >
                      {isUploadingCover ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {watchedCoverImageUrl ? "Replace Image" : "Upload Image"}
                    </Button>
                    <p className="text-xs text-muted">
                      JPEG, PNG, WebP or GIF — max 5 MB
                    </p>
                  </div>

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleCoverUpload}
                    aria-hidden="true"
                  />
                </div>
                {/* Hidden field for coverImageUrl */}
                <input type="hidden" {...register("coverImageUrl")} />
              </div>

              {/* Read time */}
              <div className="space-y-1.5 max-w-[160px]">
                <Label htmlFor="blog-read-time">Read Time (minutes) *</Label>
                <Input
                  id="blog-read-time"
                  type="number"
                  min={1}
                  max={120}
                  {...register("readTime", { valueAsNumber: true })}
                  aria-invalid={!!errors.readTime}
                />
                {errors.readTime && (
                  <p className="text-xs text-destructive">{errors.readTime.message}</p>
                )}
              </div>

              {/* Content — TiptapEditor */}
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <TiptapEditor
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.content && (
                  <p className="text-xs text-destructive">{errors.content.message}</p>
                )}
              </div>

              {/* SEO section */}
              <div className="border border-border rounded-[--zymbiq-radius] p-4 space-y-4">
                <h3 className="text-sm font-medium text-foreground">SEO</h3>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-seo-title">SEO Title</Label>
                  <Input
                    id="blog-seo-title"
                    placeholder="Overrides post title in search results"
                    {...register("seoTitle")}
                  />
                  <p className="text-xs text-muted">Leave blank to use the post title.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-seo-description">SEO Description</Label>
                  <Textarea
                    id="blog-seo-description"
                    placeholder="150–160 characters for best results"
                    rows={2}
                    {...register("seoDescription")}
                  />
                </div>
              </div>

              {/* Publish toggle */}
              <div className="flex items-center justify-between border border-border rounded-[--zymbiq-radius] p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {watchedIsPublished ? "Published" : "Draft"}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {watchedIsPublished
                      ? "Visible to the public at /blog"
                      : "Only visible to admins — not publicly accessible"}
                  </p>
                </div>
                <Controller
                  name="isPublished"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Publish toggle"
                    />
                  )}
                />
              </div>

              {/* Sticky save bar for long forms */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border sticky bottom-0 bg-background py-4 -mx-1 px-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {editingPost ? "Update Post" : "Create Post"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Empty state when no post is being edited */
        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-[--zymbiq-radius] min-h-[400px]">
          <div className="text-center">
            <FileText className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No post selected</p>
            <p className="text-xs text-muted mt-1 mb-4">
              Select a post to edit, or create a new one.
            </p>
            <Button size="sm" onClick={handleNewPost}>
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}