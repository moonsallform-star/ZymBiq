// =============================================================================
// Zymbiq — src/components/projects/similar-projects.tsx
// Row of similar projects fetched by category, excluding the current project.
// =============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';

import ProjectCard from '@/components/projects/project-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectWithFaqs } from '@/types/database';
import type { PaginatedResponse } from '@/types/api';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface SimilarProjectsProps {
  currentProjectId: string;
  category: string;
}

// -----------------------------------------------------------------------------
// Skeleton card placeholder
// -----------------------------------------------------------------------------

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col bg-surface border border-border rounded-[--zymbiq-radius] overflow-hidden h-full">
      {/* Thumbnail */}
      <Skeleton className="w-full aspect-video" />
      {/* Body */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-6 w-1/3 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-1">
        <Skeleton className="h-11 flex-1 rounded" />
        <Skeleton className="h-11 flex-1 rounded" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function SimilarProjects({
  currentProjectId,
  category,
}: SimilarProjectsProps) {
  const { data, isLoading } = useQuery<PaginatedResponse<ProjectWithFaqs>>({
    queryKey: ['projects', 'similar', currentProjectId, category],
    queryFn: async () => {
      const params = new URLSearchParams({
        category,
        limit: '3',
        exclude: currentProjectId,
      });
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch similar projects');
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  // While loading: render 3 skeleton cards
  if (isLoading) {
    return (
      <section className="py-16 border-t border-border">
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          Similar Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </section>
    );
  }

  const projects = data?.data ?? [];

  // No results: hide section entirely
  if (projects.length === 0) return null;

  return (
    <section className="py-16 border-t border-border">
      <h2 className="text-2xl font-bold mb-6 text-foreground">
        Similar Projects
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            showCompareCheckbox={false}
          />
        ))}
      </div>
    </section>
  );
}