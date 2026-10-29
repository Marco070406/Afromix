import { limitOrNull } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { created, badRequest, unauthorized, notFound, serverError } from "@/lib/response";
import { z } from "zod";

const reportSchema = z.object({
  targetType: z.enum(["MIX", "TRACK", "USER", "COMMENT", "ALBUM"]),
  targetId: z.string().min(1),
  reason: z.enum(["SPAM", "HATE_SPEECH", "COPYRIGHT", "ADULT_CONTENT", "MISINFORMATION", "OTHER"]),
  details: z.string().max(1000).optional(),
});

// POST /api/v1/reports — soumettre un signalement
export async function POST(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const limited = await limitOrNull("report", session.sub, 20, 3600);
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest("Invalid JSON body"); }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation error", parsed.error.flatten().fieldErrors);
  }

  const { targetType, targetId, reason, details } = parsed.data;

  try {
    // Vérifie que la cible existe
    const targetExists = await checkTargetExists(targetType, targetId);
    if (!targetExists) return notFound(`${targetType} not found`);

    // Vérifie qu'un report identique n'existe pas déjà (PENDING)
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: session.sub,
        targetType,
        targetId,
        status: "PENDING",
      },
    });

    if (existing) {
      return created({
        id: existing.id,
        message: "You already have a pending report for this content",
      });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.sub,
        targetType,
        targetId,
        reason,
        details,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    return created({
      ...report,
      createdAt: report.createdAt.toISOString(),
      message: "Report submitted. Our team will review it.",
    });
  } catch (err) {
    console.error("[POST /api/v1/reports]", err);
    return serverError();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkTargetExists(
  targetType: string,
  targetId: string
): Promise<boolean> {
  switch (targetType) {
    case "MIX":
      return !!(await prisma.mix.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "TRACK":
      return !!(await prisma.track.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "ALBUM":
      return !!(await prisma.album.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "USER":
      return !!(await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "COMMENT":
      return !!(await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } }));
    default:
      return false;
  }
}
