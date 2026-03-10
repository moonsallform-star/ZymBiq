"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Provider & Viewport
// ---------------------------------------------------------------------------

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-center justify-between",
    "space-x-4 overflow-hidden rounded-[--zymbiq-radius] border p-6 pr-8 shadow-lg",
    "transition-all",
    // Radix data-state animations
    "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
    "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  ],
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ---------------------------------------------------------------------------
// Toast root
// ---------------------------------------------------------------------------

const Toast = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

const ToastAction = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-[--zymbiq-radius] border",
      "bg-transparent px-3 text-sm font-medium ring-offset-background",
      "transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // destructive variant overrides via group
      "group-[.destructive]:border-white/30 group-[.destructive]:hover:border-white/60",
      "group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-white",
      "group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

const ToastClose = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-[--zymbiq-radius] p-1",
      "text-muted opacity-0 transition-opacity",
      "hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent",
      "group-hover:opacity-100",
      "group-[.destructive]:text-white/70 group-[.destructive]:hover:text-white",
      "group-[.destructive]:focus:ring-white",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

const ToastTitle = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

const ToastDescription = React.forwardRef <
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

// ---------------------------------------------------------------------------
// useToast hook
// ---------------------------------------------------------------------------

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactElement<typeof ToastAction>;
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: string;
  open: boolean;
}

type ToastAction_ =
  | { type: "ADD"; toast: ToastEntry }
  | { type: "UPDATE"; id: string; toast: Partial<ToastEntry> }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string };

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 300; // ms — matches fade-out animation

let count = 0;
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return String(count);
}

// Module-level store so state persists across hook calls (no context needed)
let listeners: Array<(state: ToastEntry[]) => void> = [];
let memoryState: ToastEntry[] = [];

function dispatch(action: ToastAction_): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

function reducer(state: ToastEntry[], action: ToastAction_): ToastEntry[] {
  switch (action.type) {
    case "ADD":
      return [action.toast, ...state].slice(0, TOAST_LIMIT);
    case "UPDATE":
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.toast } : t
      );
    case "DISMISS":
      return state.map((t) =>
        t.id === action.id ? { ...t, open: false } : t
      );
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRemove(id: string): void {
  if (removeTimers.has(id)) return;
  removeTimers.set(
    id,
    setTimeout(() => {
      removeTimers.delete(id);
      dispatch({ type: "REMOVE", id });
    }, TOAST_REMOVE_DELAY)
  );
}

export interface UseToastReturn {
  toasts: ToastEntry[];
  toast: (options: ToastOptions) => { id: string; dismiss: () => void; update: (opts: Partial<ToastOptions>) => void };
  dismiss: (id?: string) => void;
}

export function useToast(): UseToastReturn {
  const [state, setState] = React.useState<ToastEntry[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  function toast(options: ToastOptions) {
    const id = genId();
    const entry: ToastEntry = {
      ...options,
      id,
      open: true,
      duration: options.duration ?? 5000,
    };
    dispatch({ type: "ADD", toast: entry });
    return {
      id,
      dismiss: () => dismiss(id),
      update: (opts: Partial<ToastOptions>) =>
        dispatch({ type: "UPDATE", id, toast: opts }),
    };
  }

  function dismiss(id?: string): void {
    if (id) {
      dispatch({ type: "DISMISS", id });
      scheduleRemove(id);
    } else {
      state.forEach((t) => {
        dispatch({ type: "DISMISS", id: t.id });
        scheduleRemove(t.id);
      });
    }
  }

  return { toasts: state, toast, dismiss };
}

// ---------------------------------------------------------------------------
// toastVariants re-export (used by Toaster)
// ---------------------------------------------------------------------------

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  toastVariants,
};

export type { ToastOptions, ToastEntry, ToastVariant };