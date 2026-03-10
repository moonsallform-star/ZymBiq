// =============================================================================
// Zymbiq — src/components/sections/devforge-activity.tsx
// Live DevForge build activity section — hidden entirely on API failure.
// =============================================================================

'use client';

import { useDevforge } from '@/hooks/use-devforge';
import { Progress } from '@/components/ui/progress';
import { useSiteConfig } from '@/hooks/use-site-config';
import { formatDate } from '@/lib/utils';

export default function DevforgeActivity() {
  const { data } = useDevforge();
  const { data: siteConfig } = useSiteConfig();

  // Hidden when devforge is disabled in admin layout controls
  if (!siteConfig.layout.devforgeEnabled) return null;

  // Hidden when API is unreachable or returned no data
  if (data === null) return null;

  // Hidden when there is nothing to show
  if (!data.activeProject && !data.lastCompletedProject) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border border-border rounded-[var(--zymbiq-radius)] p-6 bg-surface">
          {data.activeProject ? (
            <ActiveBuild
              name={data.activeProject.name}
              currentPhase={data.activeProject.currentPhase}
              completedFiles={data.activeProject.completedFiles}
              totalFiles={data.activeProject.totalFiles}
              percentComplete={data.activeProject.percentComplete}
              estimatedCompletion={data.activeProject.estimatedCompletion}
            />
          ) : data.lastCompletedProject ? (
            <LastCompleted
              name={data.lastCompletedProject.name}
              completedAt={data.lastCompletedProject.completedAt}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Active build sub-component
// -----------------------------------------------------------------------------

interface ActiveBuildProps {
  name: string;
  currentPhase: string;
  completedFiles: number;
  totalFiles: number;
  percentComplete: number;
  estimatedCompletion: string;
}

function ActiveBuild({
  name,
  currentPhase,
  completedFiles,
  totalFiles,
  percentComplete,
  estimatedCompletion,
}: ActiveBuildProps) {
  // Guard against divide-by-zero — Progress always receives a safe value
  const safePercent = totalFiles === 0 ? 0 : Math.min(100, Math.max(0, percentComplete));

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
          aria-hidden="true"
        />
        <h3 className="text-base font-semibold text-foreground leading-tight">
          {name}
        </h3>
      </div>

      {/* Current phase */}
      <p className="text-sm text-muted">{currentPhase}</p>

      {/* File progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {completedFiles}/{totalFiles} files
          </span>
          <span className="tabular-nums font-medium text-foreground">
            {safePercent}%
          </span>
        </div>
        <Progress value={safePercent} className="h-2" aria-label="Build progress" />
      </div>

      {/* Estimated completion */}
      {estimatedCompletion && (
        <p className="text-xs text-muted">
          Estimated completion:{' '}
          <span className="text-foreground font-medium">{estimatedCompletion}</span>
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Last completed sub-component
// -----------------------------------------------------------------------------

interface LastCompletedProps {
  name: string;
  completedAt: string;
}

function LastCompleted({ name, completedAt }: LastCompletedProps) {
  const formattedDate = formatDate(new Date(completedAt));

  return (
    <div className="flex items-center gap-3">
      <span
        className="w-2 h-2 rounded-full bg-muted"
        aria-hidden="true"
      />
      <p className="text-sm text-muted">
        Last delivered:{' '}
        <span className="text-foreground font-medium">{name}</span>
        {' · '}
        <span>{formattedDate}</span>
      </p>
    </div>
  );
}