/**
 * Client API AfroMix
 * 
 * - Même origin : pas de CORS, pas de NEXT_PUBLIC_API_URL
 * - Cookies httpOnly gérés automatiquement par le navigateur (credentials: "include")
 * - Format réponse : { success: boolean, data: T, meta?: PaginationMeta }
 */

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ApiFailure {
  success: false;
  error: string;
  details?: unknown;
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

let isRefreshing: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  _isRetry = false
): Promise<ApiSuccess<T>> {
  const url = `${BASE}${path}`;

  const res = await fetch(url, {
    ...init,
    credentials: "include", // cookies httpOnly toujours inclus
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });

  // On 401, try to refresh the access token and retry once
  if (res.status === 401 && !_isRetry && path !== "/auth/refresh" && path !== "/auth/login") {
    // Coalesce concurrent refresh attempts into a single request
    if (!isRefreshing) {
      isRefreshing = tryRefreshToken().finally(() => { isRefreshing = null; });
    }
    const refreshed = await isRefreshing;
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }

  if (!json.success) {
    throw new ApiError(res.status, json.error, json.details);
  }

  return json;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  /** Upload binaire (PUT direct vers R2/S3) — sans Content-Type JSON */
  putBinary: async (url: string, file: File | Blob): Promise<void> => {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file instanceof File ? file.type : "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new ApiError(res.status, "Upload failed");
  },
};

export type { ApiSuccess };
