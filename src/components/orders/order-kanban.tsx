'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import OrderKanbanCard from '@/components/orders/order-kanban-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OrderWithDetails } from '@/types/database'
import type { OrderStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'NEW',           label: 'New Orders' },
  { status: 'IN_DISCUSSION', label: 'In Discussion' },
  { status: 'BUILDING',      label: 'Building' },
  { status: 'REVIEW',        label: 'Review' },
  { status: 'DELIVERED',     label: 'Delivered' },
]

const QUERY_KEY = ['orders', 'kanban'] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByStatus(orders: OrderWithDetails[]): Record<OrderStatus, OrderWithDetails[]> {
  const grouped = {} as Record<OrderStatus, OrderWithDetails[]>
  for (const col of COLUMNS) grouped[col.status] = []
  for (const order of orders) {
    if (grouped[order.status]) {
      grouped[order.status].push(order)
    }
  }
  return grouped
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchAllOrders(): Promise<OrderWithDetails[]> {
  const res = await fetch('/api/orders', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch orders')
  const json = await res.json()
  return (json.data ?? json) as OrderWithDetails[]
}

async function patchOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const res = await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Failed to update order status')
}

// ---------------------------------------------------------------------------
// Confirm dialog for DELIVERED gate
// ---------------------------------------------------------------------------

interface DeliveredConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

function DeliveredConfirmDialog({ onConfirm, onCancel }: DeliveredConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-surface border border-border rounded-[--zymbiq-radius] shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-foreground mb-2">
          Mark as Delivered?
        </h3>
        <p className="text-sm text-muted mb-4">
          This order&apos;s payment has not been confirmed. Moving it to{' '}
          <span className="font-medium text-foreground">Delivered</span> before
          payment is verified may cause issues. Are you sure?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Move Anyway
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OrderKanban() {
  const queryClient = useQueryClient()

  const [pendingDeliver, setPendingDeliver] = useState<{
    orderId: string
    newStatus: OrderStatus
    snapshot: OrderWithDetails[]
  } | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchAllOrders,
    staleTime: 30_000,
    // Poll every 30s as a lightweight fallback now that always-on Realtime
    // is no longer mounted at layout level. Realtime can be re-added here
    // scoped to this page component if real-time push is critical.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })

  const grouped = groupByStatus(orders)

  // ── Status mutation ────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      patchOrderStatus(id, status),
    onError: (_err, _vars, context) => {
      // Rollback on failure
      if (context) {
        queryClient.setQueryData<OrderWithDetails[]>(QUERY_KEY, context as OrderWithDetails[])
      }
    },
  })

  

  // ── Drag end handler ───────────────────────────────────────────────────────

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source } = result

      if (!destination) return
      if (destination.droppableId === source.droppableId) return

      const newStatus = destination.droppableId as OrderStatus
      const order = orders.find((o) => o.id === draggableId)
      if (!order) return

      // Gate: DELIVERED without confirmed payment — show confirm dialog
      if (newStatus === 'DELIVERED' && order.paymentStatus !== 'PAID') {
        const snapshot = orders
        setPendingDeliver({ orderId: draggableId, newStatus, snapshot })
        return
      }

      applyStatusMove(draggableId, newStatus, orders)
    },
    [orders] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const applyStatusMove = useCallback(
    (orderId: string, newStatus: OrderStatus, snapshot: OrderWithDetails[]) => {
      // Optimistic update
      queryClient.setQueryData<OrderWithDetails[]>(QUERY_KEY, (prev = []) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )

      mutation.mutate(
        { id: orderId, status: newStatus },
        {
          onError: () => {
            queryClient.setQueryData<OrderWithDetails[]>(QUERY_KEY, snapshot)
          },
        }
      )
    },
    [queryClient, mutation]
  )

  // ── Confirm dialog callbacks ───────────────────────────────────────────────

  const handleConfirmDeliver = useCallback(() => {
    if (!pendingDeliver) return
    const { orderId, newStatus, snapshot } = pendingDeliver
    setPendingDeliver(null)
    applyStatusMove(orderId, newStatus, snapshot)
  }, [pendingDeliver, applyStatusMove])

  const handleCancelDeliver = useCallback(() => {
    setPendingDeliver(null)
  }, [])

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col.status}
            className="flex-shrink-0 w-72 bg-muted/5 rounded-[--zymbiq-radius] p-3"
          >
            <div className="h-5 w-32 bg-muted/20 rounded animate-pulse mb-3" />
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-muted/10 rounded-[--zymbiq-radius] mb-2 animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {pendingDeliver && (
        <DeliveredConfirmDialog
          onConfirm={handleConfirmDeliver}
          onCancel={handleCancelDeliver}
        />
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
          {COLUMNS.map((col) => {
            const colOrders = grouped[col.status] ?? []

            return (
              <div
                key={col.status}
                className="flex-shrink-0 w-72 flex flex-col"
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-medium text-foreground">
                    {col.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5',
                      'rounded-full text-xs font-semibold',
                      colOrders.length > 0
                        ? 'bg-accent/15 text-accent'
                        : 'bg-muted/20 text-muted'
                    )}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {/* Droppable column */}
                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex flex-col gap-2 flex-1 p-2 rounded-[--zymbiq-radius] transition-colors duration-150 min-h-[200px]',
                        snapshot.isDraggingOver
                          ? 'bg-accent/5 border border-dashed border-accent/40'
                          : 'bg-muted/5 border border-transparent'
                      )}
                    >
                      {colOrders.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-[--zymbiq-radius] min-h-[120px]">
                          <span className="text-xs text-muted select-none">
                            No orders
                          </span>
                        </div>
                      )}

                      {colOrders.map((order, index) => (
                        <Draggable
                          key={order.id}
                          draggableId={order.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                'rounded-[--zymbiq-radius] transition-shadow duration-150',
                                dragSnapshot.isDragging && 'shadow-lg ring-1 ring-accent/30'
                              )}
                            >
                              <OrderKanbanCard order={order} />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </>
  )
}