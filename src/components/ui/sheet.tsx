"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Root primitives (re-exported directly)
// ---------------------------------------------------------------------------

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

const SheetOverlay = React.forwardRef <
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      // base
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      // open / close animations driven by Radix data-state
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// ---------------------------------------------------------------------------
// Content — side variants
// ---------------------------------------------------------------------------

const sheetVariants = cva(
  // base styles shared by all sides
  [
    "fixed z-50 flex flex-col",
    "bg-[var(--zymbiq-surface)] shadow-xl",
    "transition ease-in-out",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=open]:duration-300 data-[state=closed]:duration-200",
  ],
  {
    variants: {
      side: {
        top: [
          "inset-x-0 top-0",
          "border-b border-[var(--zymbiq-border)]",
          "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
        ],
        bottom: [
          "inset-x-0 bottom-0",
          "border-t border-[var(--zymbiq-border)]",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
        ],
        left: [
          "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm",
          "border-r border-[var(--zymbiq-border)]",
          "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
        ],
        right: [
          "inset-y-0 right-0 h-full w-3/4 sm:max-w-sm",
          "border-l border-[var(--zymbiq-border)]",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
        ],
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef <
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {/* Built-in close button — top-right corner */}
      <SheetPrimitive.Close
        className={cn(
          "absolute right-4 top-4 z-10",
          "rounded-[var(--zymbiq-radius)]",
          "p-1.5",
          "text-[var(--zymbiq-muted)] hover:text-[var(--zymbiq-text)]",
          "hover:bg-[var(--zymbiq-border)]",
          "transition-colors duration-150",
          // minimum touch target
          "h-8 w-8 inline-flex items-center justify-center",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zymbiq-accent)]",
          "disabled:pointer-events-none"
        )}
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </SheetPrimitive.Close>

      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

// ---------------------------------------------------------------------------
// Composition helpers
// ---------------------------------------------------------------------------

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1.5",
      "px-6 pt-6 pb-4",
      "border-b border-[var(--zymbiq-border)]",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      "px-6 py-4 mt-auto",
      "border-t border-[var(--zymbiq-border)]",
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef <
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight",
      "text-[var(--zymbiq-text)] font-heading",
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef <
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm leading-relaxed",
      "text-[var(--zymbiq-muted)]",
      className
    )}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};