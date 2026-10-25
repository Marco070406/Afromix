/**
 * Standardised API response helpers.
 * All Route Handlers should use these to ensure a consistent JSON shape.
 *
 * Success:  { success: true,  data: T,      meta?: PaginationMeta }
 * Error:    { success: false, error: string, details?: unknown }
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Success ─────────────────────────────────────────────────────────────────

export function ok<T>(
  data: T,
  options?: { status?: number; meta?: PaginationMeta }
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(options?.meta && { meta: options.meta }),
  };
  return Response.json(body, { status: options?.status ?? 200 });
}

export function created<T>(data: T): Response {
  return ok(data, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export function badRequest(error: string, details?: unknown): Response {
  return errorResponse(400, error, details);
}

export function unauthorized(error = "Unauthorized"): Response {
  return errorResponse(401, error);
}

export function forbidden(error = "Forbidden"): Response {
  return errorResponse(403, error);
}

export function notFound(error = "Not found"): Response {
  return errorResponse(404, error);
}

export function conflict(error: string): Response {
  return errorResponse(409, error);
}

export function unprocessable(error: string, details?: unknown): Response {
  return errorResponse(422, error, details);
}

export function tooManyRequests(error = "Too many requests"): Response {
  return errorResponse(429, error);
}

export function serverError(error = "Internal server error"): Response {
  return errorResponse(500, error);
}

export function serviceUnavailable(error: string): Response {
  return errorResponse(503, error);
}

function errorResponse(status: number, error: string, details?: unknown): Response {
  const body: ApiError = {
    success: false,
    error,
    ...(details !== undefined && { details }),
  };
  return Response.json(body, { status });
}

// ─── Error handler ────────────────────────────────────────────────────────────

import { AuthError } from "@/lib/auth";
import { ZodError } from "zod";

/**
 * Wraps a Route Handler callback and maps known errors to proper HTTP responses.
 * Catches AuthError, ZodError, and generic errors.
 */
export function withErrorHandler(
  handler: (req: Request, ctx?: unknown) => Promise<Response>
) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return err.status === 403
          ? forbidden(err.message)
          : unauthorized(err.message);
      }
      if (err instanceof ZodError) {
        return unprocessable("Validation error", err.flatten().fieldErrors);
      }
      console.error("[API Error]", err);
      return serverError();
    }
  };
}
