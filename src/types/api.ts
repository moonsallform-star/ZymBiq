// src/types/api.ts
// =============================================================================
// Zymbiq — API response type definitions
// Provides consistent typing for all client-server communication shapes.
// No server-only imports — safe for use in client components.
// =============================================================================

// =============================================================================
// GENERIC RESPONSE WRAPPERS
// =============================================================================

/**
 * Standard success response wrapper for all API routes.
 * All successful API responses return { data: T, message?: string }.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Standard error response wrapper for all API routes.
 * All error responses return { error: string, details?: unknown }.
 * Stack traces and internal errors are never included in details.
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Paginated list response wrapper.
 * Used by project list, blog list, and admin order list endpoints.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

// =============================================================================
// DEVFORGE
// =============================================================================

/**
 * Shape returned by GET /api/devforge/status.
 * Mirrors DevforgeStatus from src/lib/devforge.ts — duplicated here to
 * avoid a server-only import chain reaching client components.
 */
export interface DevforgeStatusResponse {
  activeProject: {
    name: string;
    currentPhase: string;
    completedFiles: number;
    totalFiles: number;
    percentComplete: number;
    estimatedCompletion: string;
  } | null;
  lastCompletedProject: {
    name: string;
    completedAt: string;
  } | null;
}

// =============================================================================
// AI RESPONSES
// =============================================================================

/**
 * Shape returned by POST /api/ai/search.
 * Projects typed as unknown[] to avoid a circular import with
 * src/types/database.ts — callers cast to ProjectWithFaqs[] as needed.
 */
export interface AiSearchResponse {
  projects: unknown[];
  query: string;
}

/**
 * Price and timeline estimate produced by the custom order AI assistant.
 * Returned inside the assistant response when isComplete === true.
 */
export interface AiEstimateResponse {
  estimatedMinPrice: number;
  estimatedMaxPrice: number;
  timeline: string;
  complexity: string;
  breakdown: string;
}

/**
 * Full response shape from POST /api/ai/assistant.
 * The assistant streams a message and optionally includes a price estimate
 * on the final step when isComplete is true.
 */
export interface AiAssistantResponse {
  message: string;
  isComplete: boolean;
  estimate?: AiEstimateResponse;
}

// =============================================================================
// PAYMENT RESPONSES
// =============================================================================

/**
 * Response from POST /api/payments/stripe/create-intent.
 * clientSecret is passed to Stripe Elements client-side.
 */
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  orderId: string;
}

/**
 * Response from POST /api/payments/manual.
 * Client shows this status to the user after submitting a transaction ID.
 */
export interface ManualPaymentSubmitResponse {
  status: 'pending_verification';
  trackingCode: string;
}

/**
 * Response from PATCH /api/payments/manual/[orderId]/verify.
 * Used by the admin payment verification panel.
 */
export interface ManualPaymentVerifyResponse {
  orderId: string;
  action: 'confirm' | 'reject';
  paymentStatus: string;
  orderStatus: string;
}

// =============================================================================
// ORDER RESPONSES
// =============================================================================

/**
 * Minimal response after order creation — enough for the client to
 * redirect to the order tracker or confirmation screen.
 */
export interface CreateOrderResponse {
  orderId: string;
  trackingCode: string;
}

// =============================================================================
// UPLOAD RESPONSES
// =============================================================================

/**
 * Response from POST /api/upload.
 * Returns the Cloudinary asset details needed to store in the DB.
 */
export interface UploadResponse {
  url: string;
  publicId: string;
  width: number;
  height: number;
  blurDataURL: string;
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Body shape accepted by POST /api/analytics/track.
 * Used by client components to fire non-blocking analytics events.
 */
export interface AnalyticsTrackPayload {
  event: 'page_view' | 'project_view' | 'order_started' | 'checkout_visited' | 'demo_clicked';
  page?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}