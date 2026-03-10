"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Upload, Loader2, Image as ImageIcon } from "lucide-react";

import { ProjectSchema, type ProjectInput } from "@/lib/validations";
import { PROJECT_CATEGORIES, TECH_STACK_OPTIONS, COMPLEXITY_LEVELS, COMPLEXITY_LABELS, QUERY_KEYS, MAX_UPLOAD_SIZE_BYTES, CLOUDINARY_FOLDERS } from "@/lib/constants";
import { slugify, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { ProjectWithFaqs } from "@/types/database";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectFormProps {
  project?: ProjectWithFaqs;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const DEFAULT_VALUES: ProjectInput = {
  title: "",
  slug: "",
  description: "",
  category: "",
  techStack: [],
  price: 0,
  demoUrl: "",
  githubRepo: "",
  features: [],
  qualityScore: 100,
  buildTime: "",
  fileCount: 0,
  thumbnailUrl: "",
  isFeatured: false,
  isVisible: true,
  complexity: "medium",
  sortOrder: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = Boolean(project?.id);

  // Track whether slug has been manually edited
  const slugManuallyEdited = React.useRef(isEditing);

  // Tech stack tag input state
  const [techInput, setTechInput] = React.useState("");

  // Thumbnail upload state
  const [thumbnailPreview, setThumbnailPreview] = React.useState<string>(
    project?.thumbnailUrl ?? ""
  );
  const [uploadingThumbnail, setUploadingThumbnail] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // React Hook Form
  // ---------------------------------------------------------------------------

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: project
      ? {
          title: project.title,
          slug: project.slug,
          description: project.description,
          category: project.category,
          techStack: project.techStack,
          price: project.price,
          demoUrl: project.demoUrl ?? "",
          githubRepo: project.githubRepo ?? "",
          features: project.features,
          qualityScore: project.qualityScore,
          buildTime: project.buildTime,
          fileCount: project.fileCount,
          thumbnailUrl: project.thumbnailUrl ?? "",
          isFeatured: project.isFeatured,
          isVisible: project.isVisible,
          complexity: project.complexity as ProjectInput["complexity"],
          sortOrder: project.sortOrder,
        }
      : DEFAULT_VALUES,
  });

  // Feature list field array
  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({ control, name: "features" as never });

  const watchedTitle = watch("title");
  const watchedTechStack = watch("techStack");
  const watchedQualityScore = watch("qualityScore");

  // ---------------------------------------------------------------------------
  // Auto-slug from title
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (!slugManuallyEdited.current && watchedTitle) {
      setValue("slug", slugify(watchedTitle), { shouldValidate: false });
    }
  }, [watchedTitle, setValue]);

  // ---------------------------------------------------------------------------
  // Thumbnail upload
  // ---------------------------------------------------------------------------

  async function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailError("");

    // Client-side size check
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setThumbnailError("Image must be smaller than 5 MB.");
      return;
    }

    // MIME type check
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setThumbnailError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreview(objectUrl);
    setUploadingThumbnail(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", CLOUDINARY_FOLDERS.PROJECTS);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Upload failed");
      }

      const json = (await res.json()) as { data?: { url: string } };
      const url = json.data?.url;
      if (!url) throw new Error("Upload succeeded but no URL was returned");
      setValue("thumbnailUrl", url, { shouldValidate: true });
      setThumbnailPreview(url);
    } catch (err) {
      setThumbnailError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
      setThumbnailPreview(project?.thumbnailUrl ?? "");
      setValue("thumbnailUrl", project?.thumbnailUrl ?? "");
    } finally {
      setUploadingThumbnail(false);
      // Reset file input so the same file can be re-selected after error
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ---------------------------------------------------------------------------
  // Tech stack tag input
  // ---------------------------------------------------------------------------

  function addTechTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    const current = watchedTechStack ?? [];
    if (!current.includes(tag)) {
      setValue("techStack", [...current, tag], { shouldValidate: true });
    }
    setTechInput("");
  }

  function removeTechTag(tag: string) {
    const current = watchedTechStack ?? [];
    setValue(
      "techStack",
      current.filter((t) => t !== tag),
      { shouldValidate: true }
    );
  }

  function handleTechKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTechTag(techInput);
    }
  }

  // ---------------------------------------------------------------------------
  // Submit mutation
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: async (data: ProjectInput) => {
      const url = isEditing
        ? `/api/projects/${project!.slug}`
        : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 409) {
        // Slug conflict
        throw Object.assign(new Error("SLUG_CONFLICT"), { status: 409 });
      }

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save project");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      toast({
        title: isEditing ? "Project updated" : "Project created",
        description: isEditing
          ? "Your changes have been saved."
          : "The project is now live in the showroom.",
      });
      onSuccess?.();
    },
    onError: (err: Error & { status?: number }) => {
      if (err.status === 409 || err.message === "SLUG_CONFLICT") {
        setError("slug", { message: "Slug already in use — please choose another." });
        return;
      }
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectInput) => mutation.mutate(data);

  const isPending = isSubmitting || mutation.isPending || uploadingThumbnail;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Title + Slug ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="e.g. Restaurant Booking Site"
            {...register("title")}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            placeholder="e.g. restaurant-booking-site"
            {...register("slug", {
              onChange: () => {
                slugManuallyEdited.current = true;
              },
            })}
            aria-invalid={!!errors.slug}
          />
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Describe what this project does and who it's for..."
          {...register("description")}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* ── Category + Complexity ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Complexity *</Label>
          <Controller
            control={control}
            name="complexity"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={!!errors.complexity}>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {COMPLEXITY_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.complexity && (
            <p className="text-xs text-destructive">{errors.complexity.message}</p>
          )}
        </div>
      </div>

      {/* ── Tech Stack ── */}
      <div className="space-y-1.5">
        <Label>Tech Stack</Label>
        <div className="space-y-2">
          {/* Selected tags */}
          {(watchedTechStack ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(watchedTechStack ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTechTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tag input */}
          <Input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={handleTechKeyDown}
            onBlur={() => addTechTag(techInput)}
            placeholder="Type a tech and press Enter or comma…"
          />

          {/* Quick-add chips */}
          <div className="flex flex-wrap gap-1">
            {TECH_STACK_OPTIONS.filter(
              (opt) => !(watchedTechStack ?? []).includes(opt)
            ).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => addTechTag(opt)}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-accent transition-colors"
              >
                + {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Price + Build Time + File Count ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (USD) *</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={0.01}
            placeholder="299"
            {...register("price", { valueAsNumber: true })}
            aria-invalid={!!errors.price}
          />
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buildTime">Build Time *</Label>
          <Input
            id="buildTime"
            placeholder="e.g. 2–3 days"
            {...register("buildTime")}
            aria-invalid={!!errors.buildTime}
          />
          {errors.buildTime && (
            <p className="text-xs text-destructive">{errors.buildTime.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fileCount">File Count</Label>
          <Input
            id="fileCount"
            type="number"
            min={0}
            step={1}
            placeholder="42"
            {...register("fileCount", { valueAsNumber: true })}
            aria-invalid={!!errors.fileCount}
          />
          {errors.fileCount && (
            <p className="text-xs text-destructive">{errors.fileCount.message}</p>
          )}
        </div>
      </div>

      {/* ── Demo URL + GitHub Repo ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="demoUrl">Demo URL</Label>
          <Input
            id="demoUrl"
            type="url"
            placeholder="https://demo.example.com"
            {...register("demoUrl")}
            aria-invalid={!!errors.demoUrl}
          />
          {errors.demoUrl && (
            <p className="text-xs text-destructive">{errors.demoUrl.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="githubRepo">GitHub Repo URL</Label>
          <Input
            id="githubRepo"
            type="url"
            placeholder="https://github.com/you/repo"
            {...register("githubRepo")}
            aria-invalid={!!errors.githubRepo}
          />
          {errors.githubRepo && (
            <p className="text-xs text-destructive">{errors.githubRepo.message}</p>
          )}
        </div>
      </div>

      {/* ── Quality Score ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Quality Score</Label>
          <span className="text-sm font-semibold text-accent">
            {watchedQualityScore ?? 100}
          </span>
        </div>
        <Controller
          control={control}
          name="qualityScore"
          render={({ field }) => (
            <Slider
              min={0}
              max={100}
              step={1}
              value={[field.value ?? 100]}
              onValueChange={([val]) => field.onChange(val)}
            />
          )}
        />
        {errors.qualityScore && (
          <p className="text-xs text-destructive">{errors.qualityScore.message}</p>
        )}
      </div>

      {/* ── Features ── */}
      <div className="space-y-2">
        <Label>Features</Label>
        <div className="space-y-2">
          {featureFields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                placeholder={`Feature ${index + 1}`}
                {...register(`features.${index}` as const)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeFeature(index)}
                aria-label="Remove feature"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendFeature("" as never)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Feature
          </Button>
        </div>
      </div>

      {/* ── Thumbnail Upload ── */}
      <div className="space-y-2">
        <Label>Thumbnail Image</Label>
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div
            className={cn(
              "relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-[--zymbiq-radius] border border-border bg-muted/10",
              uploadingThumbnail && "opacity-60"
            )}
          >
            {thumbnailPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted" />
            )}
            {uploadingThumbnail && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface/60">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}
          </div>

          {/* Upload button */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleThumbnailChange}
              className="hidden"
              id="thumbnail-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingThumbnail}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploadingThumbnail ? "Uploading…" : "Upload Image"}
            </Button>
            <p className="text-xs text-muted">
              JPEG, PNG, WebP or GIF — max 5 MB
            </p>
            {thumbnailError && (
              <p className="text-xs text-destructive">{thumbnailError}</p>
            )}
          </div>
        </div>
        {/* Hidden input to register thumbnailUrl value */}
        <input type="hidden" {...register("thumbnailUrl")} />
      </div>

      {/* ── Toggles ── */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="isFeatured"
            render={({ field }) => (
              <Switch
                id="isFeatured"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isFeatured" className="cursor-pointer">
            Featured in carousel
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="isVisible"
            render={({ field }) => (
              <Switch
                id="isVisible"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isVisible" className="cursor-pointer">
            Visible in showroom
          </Label>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="min-w-[120px]"
        >
          {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}