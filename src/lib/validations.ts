// src/lib/validations.ts
import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ---------------------------------------------------------------------------
// Project Schema
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  techStack: z.array(z.string()),
  price: z.number().positive("Price must be greater than zero"),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  githubRepo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  features: z.array(z.string()),
  qualityScore: z
    .number()
    .int()
    .min(0, "Quality score must be at least 0")
    .max(100, "Quality score must be at most 100"),
  buildTime: z.string().min(1, "Build time is required"),
  fileCount: z
    .number()
    .int()
    .nonnegative("File count must be zero or greater"),
  thumbnailUrl: z.string().optional(),
  isFeatured: z.boolean(),
  isVisible: z.boolean(),
  complexity: z.enum(["simple", "medium", "complex", "enterprise"]),
  sortOrder: z.number().int().optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

// ---------------------------------------------------------------------------
// Order Schemas
// ---------------------------------------------------------------------------

export const OrderSchema = z.object({
  orderType: z.enum(["PREBUILT", "CUSTOM"]),
  projectId: z.string().optional(),
  paymentMethod: z.enum(["STRIPE", "BKASH", "NAGAD"]),
  guestEmail: z.string().email("Please enter a valid email address").optional(),
  guestName: z.string().optional(),
  guestPhone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Please enter a valid phone number")
    .optional(),
  customBrief: z.unknown().optional(),
  estimatedPrice: z.number().positive().optional(),
  estimatedTimeline: z.string().optional(),
  amountUsd: z.number().positive().optional(),
  amountBdt: z.number().positive().optional(),
});

export type OrderInput = z.infer<typeof OrderSchema>;

export const CustomOrderSchema = z.object({
  description: z
    .string()
    .min(20, "Please describe your project in at least 20 characters"),
  budget: z.string().optional(),
  deadline: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Please enter a valid phone number")
    .optional(),
});

export type CustomOrderInput = z.infer<typeof CustomOrderSchema>;

// ---------------------------------------------------------------------------
// Message Schema
// ---------------------------------------------------------------------------

export const MessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
  threadId: z.string().optional(),
  orderId: z.string().optional(),
});

export type MessageInput = z.infer<typeof MessageSchema>;

// ---------------------------------------------------------------------------
// Blog Post Schema
// ---------------------------------------------------------------------------

export const BlogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  excerpt: z.string().min(1, "Excerpt is required"),
  content: z.string(),
  coverImageUrl: z.string().optional(),
  readTime: z
    .number()
    .int()
    .positive("Read time must be a positive number"),
  isPublished: z.boolean(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export type BlogPostInput = z.infer<typeof BlogPostSchema>;

// ---------------------------------------------------------------------------
// Testimonial Schema
// ---------------------------------------------------------------------------

export const TestimonialSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  projectType: z.string().min(1, "Project type is required"),
  quote: z.string().min(1, "Quote is required"),
  avatarUrl: z.string().optional(),
  isVisible: z.boolean(),
  sortOrder: z.number().int(),
});

export type TestimonialInput = z.infer<typeof TestimonialSchema>;

// ---------------------------------------------------------------------------
// FAQ Schema
// ---------------------------------------------------------------------------

export const FaqSchema = z.object({
  category: z.string().min(1, "Category is required"),
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
});

export type FaqInput = z.infer<typeof FaqSchema>;

// ---------------------------------------------------------------------------
// Pricing Tier Schema
// ---------------------------------------------------------------------------

export const PricingTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().nonnegative("Price must be zero or greater"),
  billingLabel: z.string().min(1, "Billing label is required"),
  features: z.array(z.string()),
  isRecommended: z.boolean(),
  ctaLabel: z.string().min(1, "CTA label is required"),
  sortOrder: z.number().int(),
  isVisible: z.boolean(),
});

export type PricingTierInput = z.infer<typeof PricingTierSchema>;

// ---------------------------------------------------------------------------
// SiteConfig Schema
// ---------------------------------------------------------------------------

export const SiteConfigSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.unknown(),
});

export type SiteConfigInput = z.infer<typeof SiteConfigSchema>;

// ---------------------------------------------------------------------------
// Appearance Schema
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #6366F1)");

export const AppearanceSchema = z.object({
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  backgroundColor: hexColor,
  textColor: hexColor,
  mutedColor: hexColor,
  headingFont: z.string().min(1, "Heading font is required"),
  bodyFont: z.string().min(1, "Body font is required"),
  spacingScale: z.string().min(1, "Spacing scale is required"),
  borderRadius: z.string().min(1, "Border radius is required"),
  darkMode: z.boolean(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
});

export type AppearanceInput = z.infer<typeof AppearanceSchema>;

// ---------------------------------------------------------------------------
// Payment Schemas
// ---------------------------------------------------------------------------

export const ManualPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentMethod: z.enum(["BKASH", "NAGAD"]),
  transactionId: z
    .string()
    .min(5, "Transaction ID must be at least 5 characters"),
  amountBdt: z.number().positive("Amount must be greater than zero"),
});

export type ManualPaymentInput = z.infer<typeof ManualPaymentSchema>;

// ---------------------------------------------------------------------------
// Contact Schema
// ---------------------------------------------------------------------------

export const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Please enter a valid phone number")
    .optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;