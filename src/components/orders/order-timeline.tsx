// src/components/orders/order-timeline.tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, XCircle, Clock, FileCode2 } from "lucide-react";
import { useOrderRealtime } from "@/hooks/use-realtime";
import { useDevforgeProject } from "@/hooks/use-devforge-project";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { OrderWithDetails } from "@/types/database";
import type { OrderStatus } from "@prisma/client";

// =============================================================================
// CONSTANTS
// =============================================================================

const PHASES: { status: OrderStatus; label: string; description: string }[] = [
  {
    status: "NEW",
    label: "Order Received",
    description: "Your order has been submitted and is awaiting review.",
  },
  {
    status: "IN_DISCUSSION",
    label: "In Discussion",
    description: "We're reviewing your requirements and aligning on scope.",
  },
  {
    status: "BUILDING",
    label: "Building",
    description: "Active development is underway on your project.",
  },
  {
    status: "REVIEW",
    label: "Review",
    description: "The project is ready for your review and feedback.",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    description: "Your project has been delivered. Enjoy!",
  },
];

const ACTIVE_PHASE_ORDER: OrderStatus[] = [
  "NEW",
  "IN_DISCUSSION",
  "BUILDING",
  "REVIEW",
  "DELIVERED",
];

// =============================================================================
// HELPERS
// =============================================================================

function getPhaseIndex(status: OrderStatus): number {
  return ACTIVE_PHASE_ORDER.indexOf(status);
}

function isCancelled(status: OrderStatus): boolean {
  return status === "CANCELLED";
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PhaseCircleProps {
  state: "completed" | "current" | "pending" | "cancelled";
}

function PhaseCircle({ state }: PhaseCircleProps) {
  if (state === "completed") {
    return (
      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm">
        <CheckCircle2 className="h-5 w-5" />
      </span>
    );
  }

  if (state === "cancelled") {
    return (
      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive shadow-sm">
        <XCircle className="h-5 w-5" />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="relative z-10 flex h-8 w-8 items-center justify-center">
        {/* Outer pulse ring */}
        <AnimatePresence>
          <motion.span
            key="ring"
            className="absolute inset-0 rounded-full bg-accent/20"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        </AnimatePresence>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-md ring-2 ring-accent/30 ring-offset-2 ring-offset-background">
          <Circle className="h-4 w-4 fill-white" />
        </span>
      </span>
    );
  }

  // pending
  return (
    <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-surface text-muted">
      <Circle className="h-3 w-3" />
    </span>
  );
}

interface ConnectorLineProps {
  filled: boolean;
}

function ConnectorLine({ filled }: ConnectorLineProps) {
  return (
    <div className="relative mx-auto w-0.5 flex-1" style={{ minHeight: "2rem" }}>
      {/* Background track */}
      <div className="absolute inset-0 bg-border" />
      {/* Filled progress */}
      {filled && (
        <motion.div
          className="absolute inset-0 bg-accent"
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface OrderTimelineProps {
  order: OrderWithDetails;
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const [currentOrder, setCurrentOrder] = useState<OrderWithDetails>(order);

  const handleRealtimeUpdate = useCallback(
    (updated: Record<string, unknown>) => {
      setCurrentOrder((prev) => ({
        ...prev,
        status: (updated.status as OrderStatus) ?? prev.status,
        updatedAt: updated.updatedAt ? new Date(updated.updatedAt as string) : prev.updatedAt,
        estimatedTimeline: updated.estimatedTimeline !== undefined
          ? (updated.estimatedTimeline as string | null)
          : prev.estimatedTimeline,
        devforgeProjectId: updated.devforgeProjectId !== undefined
          ? (updated.devforgeProjectId as string | null)
          : prev.devforgeProjectId,
        buildPhase: updated.buildPhase !== undefined
          ? (updated.buildPhase as string | null)
          : (prev as unknown as { buildPhase?: string | null }).buildPhase,
      }));
    },
    []
  );

  useOrderRealtime(order.id, handleRealtimeUpdate);

  const { data: devforgeData } = useDevforgeProject(currentOrder.devforgeProjectId);

  const cancelled = isCancelled(currentOrder.status);
  const currentPhaseIndex = cancelled
    ? getPhaseIndex("NEW") // show at first phase visually for cancelled
    : getPhaseIndex(currentOrder.status);

  // For cancelled orders, highlight the last recorded active phase
  // We infer it from updatedAt order — show red at last non-cancelled phase
  const cancelledAtIndex = cancelled
    ? Math.max(0, getPhaseIndex("NEW"))
    : -1;

  const showDevforge =
    currentOrder.orderType === "CUSTOM" &&
    Boolean(currentOrder.devforgeProjectId) &&
    currentOrder.status === "BUILDING" &&
    devforgeData?.activeProject !== null &&
    devforgeData?.activeProject !== undefined;

  return (
    <div className="flex flex-col gap-0">
      {/* Timeline phases */}
      {PHASES.map((phase, index) => {
        const isCompleted = !cancelled && index < currentPhaseIndex;
        const isCurrent = !cancelled && index === currentPhaseIndex;
        const isPending = !cancelled && index > currentPhaseIndex;
        const isCancelledPhase = cancelled && index === cancelledAtIndex;

        let circleState: "completed" | "current" | "pending" | "cancelled";
        if (cancelled && isCancelledPhase) {
          circleState = "cancelled";
        } else if (isCompleted) {
          circleState = "completed";
        } else if (isCurrent) {
          circleState = "current";
        } else {
          circleState = "pending";
        }

        const isLastPhase = index === PHASES.length - 1;
        const lineIsFilled = !cancelled && index < currentPhaseIndex;

        // Timestamp: show updatedAt on the current phase, createdAt on NEW
        const timestamp =
          index === 0
            ? currentOrder.createdAt
            : isCurrent || isCompleted
            ? currentOrder.updatedAt
            : null;

        return (
          <div key={phase.status} className="flex items-stretch gap-4">
            {/* Left: circle + connector */}
            <div className="flex w-8 flex-col items-center">
              <PhaseCircle state={circleState} />
              {!isLastPhase && <ConnectorLine filled={lineIsFilled} />}
            </div>

            {/* Right: content */}
            <div
              className={cn(
                "flex flex-col pb-6",
                isLastPhase && "pb-0",
                isCurrent ? "text-foreground" : isPending ? "text-muted" : "text-foreground"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold leading-tight",
                  isCurrent && "text-accent",
                  cancelled && isCancelledPhase && "text-destructive"
                )}
              >
                {cancelled && isCancelledPhase
                  ? "Order Cancelled"
                  : phase.label}
              </span>

              {(isCurrent || isCompleted) && !cancelled && (
                <span className="mt-0.5 text-xs text-muted leading-snug">
                  {phase.status === 'BUILDING' && (currentOrder as unknown as { buildPhase?: string | null }).buildPhase
                    ? (() => {
                        const phaseMap: Record<string, string> = {
                          generating_files: '⚙️ Generating Files — AI-assisted file generation in progress',
                          fixing_bugs: '🐛 Fixing Bugs — Resolving errors and issues',
                          testing: '🧪 End-to-End Testing — Manually testing all flows',
                          ready_for_review: '✅ Ready for Review — Build complete, awaiting your review',
                        };
                        return phaseMap[(currentOrder as unknown as { buildPhase: string }).buildPhase] ?? phase.description;
                      })()
                    : phase.description}
                </span>
              )}

              {timestamp && (
                <span className="mt-1 text-xs text-muted/70">
                  <Clock className="mr-1 inline h-3 w-3 align-[-1px]" />
                  {formatDate(new Date(timestamp as string | Date))}
                </span>
              )}

              {/* DevForge progress — shown inside BUILDING phase */}
              {isCurrent &&
                phase.status === "BUILDING" &&
                showDevforge &&
                devforgeData?.activeProject && (
                  <motion.div
                    className="mt-3 w-full max-w-xs rounded-lg border border-border bg-surface p-3 shadow-sm"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <FileCode2 className="h-3.5 w-3.5 text-accent" />
                        {devforgeData.activeProject.name}
                      </span>
                      <span className="text-xs font-semibold text-accent">
                        {devforgeData.activeProject.percentComplete}%
                      </span>
                    </div>

                    <Progress
                      value={devforgeData.activeProject.percentComplete}
                      className="h-1.5"
                    />

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                      <span>
                        Phase:{" "}
                        <span className="font-medium text-foreground">
                          {devforgeData.activeProject.currentPhase}
                        </span>
                      </span>
                      <span>
                        {devforgeData.activeProject.completedFiles}/
                        {devforgeData.activeProject.totalFiles} files
                      </span>
                    </div>

                    {devforgeData.activeProject.estimatedCompletion && (
                      <p className="mt-1.5 text-[11px] text-muted">
                        Est. completion:{" "}
                        <span className="font-medium text-foreground">
                          {devforgeData.activeProject.estimatedCompletion}
                        </span>
                      </p>
                    )}
                  </motion.div>
                )}
            </div>
          </div>
        );
      })}

      {/* Footer meta */}
      <div className="mt-4 border-t border-border pt-4 text-xs text-muted">
        <span>
          Last updated:{" "}
          <span className="font-medium text-foreground">
            {formatDate(new Date(currentOrder.updatedAt as string | Date))}
          </span>
        </span>

        {currentOrder.estimatedTimeline && !cancelled && (
          <span className="ml-4">
            Estimated delivery:{" "}
            <span className="font-medium text-foreground">
              {currentOrder.estimatedTimeline}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}