"use client"
// src/components/ui/dialog.tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

// ---------------------------------------------------------------------------
// Overlay
// ---------------------------------------------------------------------------

const DialogOverlay = React.forwardRef <
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Base
      "fixed inset-0 z-[var(--z-modal)] bg-black/50 backdrop-blur-sm",
      // Radix state animations
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const DialogContent = React.forwardRef <
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Position — centered via translate
        "fixed left-1/2 top-1/2 z-[var(--z-modal)]",
        "-translate-x-1/2 -translate-y-1/2",
        // Size
        "w-full max-w-lg",
        // Surface
        "bg-[var(--zymbiq-surface)] border border-[var(--zymbiq-border)]",
        "rounded-[var(--zymbiq-radius)] shadow-lg",
        // Spacing
        "p-6",
        // Scroll safety on small viewports
        "max-h-[90vh] overflow-y-auto",
        // Radix state animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        "duration-200",
        className
      )}
      {...props}
    >
      {children}

      {/* Close button — top-right corner */}
      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4",
          "rounded-[var(--zymbiq-radius)]",
          "text-[var(--zymbiq-muted)]",
          "opacity-70 transition-opacity",
          "hover:opacity-100 hover:text-[var(--zymbiq-text)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zymbiq-accent)]",
          "disabled:pointer-events-none",
          // Minimum touch target
          "h-8 w-8 flex items-center justify-center"
        )}
        aria-label="Close dialog"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1.5",
      // Leave space for the close button on the right
      "pr-8",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2",
      "sm:flex-row sm:justify-end",
      "mt-6",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

const DialogTitle = React.forwardRef <
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight",
      "text-[var(--zymbiq-text)]",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

const DialogDescription = React.forwardRef <
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm leading-relaxed",
      "text-[var(--zymbiq-muted)]",
      className
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
