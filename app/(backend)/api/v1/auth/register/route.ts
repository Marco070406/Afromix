import { registerUser } from "@/services/auth";
import { registerSchema } from "@/lib/validations/auth";
import { created, badRequest, conflict, serverError } from "@/lib/response";
import { rateLimit, clientIp } from "@/lib/redis";
import { headers } from "next/headers";

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 5 registrations per minute per IP
  const headersList = await headers();
  const ip = clientIp(headersList);
  const { allowed } = await rateLimit(`register:${ip}`, 5, 60);
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  try {
    const result = await registerUser(parsed.data);
    return created({
      userId: result.userId,
      email: result.email,
      role: result.role,
      emailVerified: result.emailVerified,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 409) return conflict(e.message);
    console.error("[POST /api/v1/auth/register]", err);
    return serverError();
  }
}
