// =============================================================================
// Zymbiq — src/app/(admin)/admin/projects/_components/admin-projects-client.tsx
// Client: DnD sortable table, visibility/featured toggles, add/edit/delete.
// =============================================================================

"use client";

import * as React from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import ProjectForm from "@/components/admin/project-form";
import { formatCurrency, cn } from "@/lib/utils";
import { QUERY_KEYS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import type { ProjectWithFaqs } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectWithCount = ProjectWithFaqs & { orderCount: number };

interface AdminProjectsClientProps {
  projects: ProjectWithCount[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminProjectsClient({
  projects: initialProjects,
}: AdminProjectsClientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Local list — mutated by DnD and toggle responses
  const [projects, setProjects] =
    React.useState<ProjectWithCount[]>(initialProjects);

  // Sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingProject, setEditingProject] =
    React.useState<ProjectWithCount | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] =
    React.useState<ProjectWithCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Per-row toggle loading sets
  const [togglingVisible, setTogglingVisible] = React.useState<Set<string>>(
    new Set()
  );
  const [togglingFeatured, setTogglingFeatured] = React.useState<Set<string>>(
    new Set()
  );

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({
      slug,
      sortOrder,
    }: {
      slug: string;
      sortOrder: number;
    }) => {
      const res = await fetch(`/api/projects/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    },
    onError: () => {
      // Rollback to initial on error
      setProjects(initialProjects);
      toast({
        title: "Reorder failed",
        description: "Could not save the new order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ---------------------------------------------------------------------------
  // DnD handler
  // ---------------------------------------------------------------------------

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(projects);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update local sortOrder values
    const updated = reordered.map((p, i) => ({ ...p, sortOrder: i }));
    setProjects(updated);

    // Fire PATCH for every project whose sortOrder changed
    updated.forEach((p, i) => {
      if (projects[i]?.id !== p.id) {
        reorderMutation.mutate({ slug: p.slug, sortOrder: p.sortOrder });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Toggle visibility
  // ---------------------------------------------------------------------------

  async function handleToggleVisible(project: ProjectWithCount) {
    setTogglingVisible((s) => new Set(s).add(project.id));
    const next = !project.isVisible;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, isVisible: next } : p))
    );

    try {
      const res = await fetch(`/api/projects/${project.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, isVisible: project.isVisible } : p
        )
      );
      toast({
        title: "Toggle failed",
        description: "Could not update visibility.",
        variant: "destructive",
      });
    } finally {
      setTogglingVisible((s) => {
        const next = new Set(s);
        next.delete(project.id);
        return next;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle featured
  // ---------------------------------------------------------------------------

  async function handleToggleFeatured(project: ProjectWithCount) {
    setTogglingFeatured((s) => new Set(s).add(project.id));
    const next = !project.isFeatured;

    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, isFeatured: next } : p))
    );

    try {
      const res = await fetch(`/api/projects/${project.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, isFeatured: project.isFeatured } : p
        )
      );
      toast({
        title: "Toggle failed",
        description: "Could not update featured status.",
        variant: "destructive",
      });
    } finally {
      setTogglingFeatured((s) => {
        const next = new Set(s);
        next.delete(project.id);
        return next;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/projects/${deleteTarget.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      toast({ title: "Project deleted" });
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not delete the project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Sheet helpers
  // ---------------------------------------------------------------------------

  function openAdd() {
    setEditingProject(null);
    setSheetOpen(true);
  }

  function openEdit(project: ProjectWithCount) {
    setEditingProject(project);
    setSheetOpen(true);
  }

  function handleFormSuccess(updated?: ProjectWithCount) {
    setSheetOpen(false);

    if (updated) {
      // Edit: replace in list
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } else {
      // New project: trigger a router refresh via query invalidation —
      // the server will re-fetch the full list on next navigation
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      // Also refetch from server by refreshing the page data
      window.location.reload();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      {/* ── Table ── */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">No projects yet.</p>
          <Button variant="outline" onClick={openAdd} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Add your first project
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          {/* Table header */}
          <div className="min-w-[700px] grid grid-cols-[2rem_3rem_1fr_10rem_8rem_7rem_7rem_7rem] items-center gap-3 border-b border-border bg-muted/5 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted">
            <span aria-hidden />
            <span>Img</span>
            <span>Title</span>
            <span>Category</span>
            <span>Price</span>
            <span>Visible</span>
            <span>Featured</span>
            <span>Actions</span>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="projects">
              {(droppable) => (
                <div
                  ref={droppable.innerRef}
                  {...droppable.droppableProps}
                  className="divide-y divide-border min-w-[700px]"
                >
                  {projects.map((project, index) => (
                    <Draggable
                      key={project.id}
                      draggableId={project.id}
                      index={index}
                    >
                      {(draggable, snapshot) => (
                        <div
                          ref={draggable.innerRef}
                          {...draggable.draggableProps}
                          className={cn(
                            "grid grid-cols-[2rem_3rem_1fr_10rem_8rem_7rem_7rem_7rem] items-center gap-3 px-4 py-3 transition-colors",
                            snapshot.isDragging
                              ? "bg-accent/5 shadow-lg"
                              : "hover:bg-muted/5"
                          )}
                        >
                          {/* Drag handle */}
                          <button
                            {...draggable.dragHandleProps}
                            className="flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted hover:text-foreground active:cursor-grabbing"
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>

                          {/* Thumbnail */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/10">
                            {project.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={project.thumbnailUrl}
                                alt={project.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted">
                                {project.category.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Title + slug */}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {project.title}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs text-muted">
                                /{project.slug}
                              </span>
                              {project.demoUrl && (
                                <a
                                  href={project.demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted hover:text-accent"
                                  aria-label="View demo"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Category */}
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {project.category}
                            </Badge>
                          </div>

                          {/* Price */}
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(project.price)}
                          </div>

                          {/* Visible toggle */}
                          <div>
                            <Switch
                              checked={project.isVisible}
                              onCheckedChange={() =>
                                handleToggleVisible(project)
                              }
                              disabled={togglingVisible.has(project.id)}
                              aria-label={`${project.isVisible ? "Hide" : "Show"} ${project.title}`}
                            />
                          </div>

                          {/* Featured toggle */}
                          <div>
                            <Switch
                              checked={project.isFeatured}
                              onCheckedChange={() =>
                                handleToggleFeatured(project)
                              }
                              disabled={togglingFeatured.has(project.id)}
                              aria-label={`${project.isFeatured ? "Unfeature" : "Feature"} ${project.title}`}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(project)}
                              aria-label={`Edit ${project.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setDeleteTarget(project);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label={`Delete ${project.title}`}
                              className="text-muted hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {droppable.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* ── Add / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {editingProject ? "Edit Project" : "Add Project"}
            </SheetTitle>
            <SheetDescription>
              {editingProject
                ? "Update the project details below."
                : "Fill in the details to add a new project to your showroom."}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 py-4">
            <ProjectForm
              project={editingProject ?? undefined}
              onSuccess={() => handleFormSuccess()}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm Dialog ── */}
      {deleteDialogOpen && deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="delete-dialog-title"
                  className="text-base font-semibold text-foreground"
                >
                  Delete &ldquo;{deleteTarget.title}&rdquo;?
                </h2>

                {deleteTarget.orderCount > 0 && (
                  <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
                    <p className="text-sm text-warning">
                      <strong>Warning:</strong> This project has{" "}
                      {deleteTarget.orderCount} existing order
                      {deleteTarget.orderCount !== 1 ? "s" : ""}. Deleting may
                      affect order records.
                    </p>
                  </div>
                )}

                <p className="mt-2 text-sm text-muted">
                  This action cannot be undone. The project will be permanently
                  removed from your showroom.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteTarget(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}