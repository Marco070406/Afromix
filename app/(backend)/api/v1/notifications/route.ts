import { listNotifications } from "@/services/notifications";
import { getSession } from "@/lib/auth";
import { ok, unauthorized, serverError } from "@/lib/response";
import { z } from "zod";
import type { NextRequest } from "next/server";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

// GET /api/v1/notifications
export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(raw);
  const { page, pageSize, unreadOnly } = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20, unreadOnly: undefined };

  try {
    const result = await listNotifications(session.sub, page, pageSize, unreadOnly ?? false);
    return ok(result.items, { meta: result.meta });
  } catch (err) {
    console.error("[GET /api/v1/notifications]", err);
    return serverError();
  }
}
