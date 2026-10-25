import { loginUser } from "@/services/auth";
import { loginSchema } from "@/lib/validations/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/response";
import { rateLimit, clientIp } from "@/lib/redis";
import { headers } from "next/headers";

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 10 login attempts per minute per IP
  const headersList = await headers();
  const ip = clientIp(headersList);
  const { allowed } = await rateLimit(`login:${ip}`, 10, 60);
  if (!allowed) {
    return Response.json(
      { success: false, error: "Too many requests" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await loginUser(parsed.data);
    return ok({
      userId: result.userId,
      email: result.email,
      role: result.role,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 401) return unauthorized(e.message);
    if (e.status === 403) return forbidden(e.message);
    console.error("[POST /api/v1/auth/login]", err);
    return serverError();
  }
}
