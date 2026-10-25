import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/redis";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentType = "mix" | "track" | "album";
export type ContentStatus = "DRAFT" | "PROCESSING" | "PUBLISHED" | "UNLISTED" | "REMOVED";

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function writeAuditLog(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      details: details !== undefined ? (details as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress,
    },
  });
}

// ─── User suspension ──────────────────────────────────────────────────────────

export async function suspendUser(
  adminId: string,
  userId: string,
  reason?: string,
  ipAddress?: string | null
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (user.deletedAt) throw Object.assign(new Error("User already suspended"), { status: 409 });

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  await writeAuditLog(adminId, "SUSPEND_USER", "USER", userId, { reason, email: user.email }, ipAddress);
}

export async function unsuspendUser(
  adminId: string,
  userId: string,
  ipAddress?: string | null
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (!user.deletedAt) throw Object.assign(new Error("User is not suspended"), { status: 409 });

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: null } });
  await writeAuditLog(adminId, "UNSUSPEND_USER", "USER", userId, { email: user.email }, ipAddress);
}

// ─── Artist verification ──────────────────────────────────────────────────────

export async function setArtistVerification(
  adminId: string,
  artistSlug: string,
  status: "VERIFIED" | "REJECTED",
  note?: string,
  ipAddress?: string | null
): Promise<void> {
  const profile = await prisma.artistProfile.findUnique({
    where: { slug: artistSlug },
    select: { id: true, userId: true, stageName: true, verificationStatus: true },
  });
  if (!profile) throw Object.assign(new Error("Artist not found"), { status: 404 });

  await prisma.artistProfile.update({
    where: { id: profile.id },
    data: { verificationStatus: status, verified: status === "VERIFIED", verificationNote: note ?? null },
  });
  await cacheDel(`artists:detail:${artistSlug}`);

  await writeAuditLog(
    adminId, `ARTIST_${status}`, "ARTIST", profile.id,
    { slug: artistSlug, stageName: profile.stageName, note, previousStatus: profile.verificationStatus },
    ipAddress
  );
}

// ─── Content moderation ───────────────────────────────────────────────────────

export async function setContentStatus(
  adminId: string,
  contentType: ContentType,
  contentId: string,
  status: ContentStatus,
  reason?: string,
  ipAddress?: string | null
): Promise<void> {
  let previousStatus: string | undefined;

  if (contentType === "mix") {
    const item = await prisma.mix.findUnique({
      where: { id: contentId },
      select: { status: true, slug: true },
    });
    if (!item) throw Object.assign(new Error("Mix not found"), { status: 404 });
    previousStatus = item.status;
    await prisma.mix.update({
      where: { id: contentId },
      data: {
        status,
        ...(status === "PUBLISHED" && !item ? { publishedAt: new Date() } : {}),
      },
    });
    await cacheDel(`mixes:detail:${item.slug}`);
  } else if (contentType === "track") {
    const item = await prisma.track.findUnique({
      where: { id: contentId },
      select: { status: true, slug: true },
    });
    if (!item) throw Object.assign(new Error("Track not found"), { status: 404 });
    previousStatus = item.status;
    await prisma.track.update({ where: { id: contentId }, data: { status } });
    await cacheDel(`tracks:detail:${item.slug}`);
  } else {
    const item = await prisma.album.findUnique({
      where: { id: contentId },
      select: { status: true, slug: true },
    });
    if (!item) throw Object.assign(new Error("Album not found"), { status: 404 });
    previousStatus = item.status;
    await prisma.album.update({ where: { id: contentId }, data: { status } });
    await cacheDel(`albums:detail:${item.slug}`);
  }

  await writeAuditLog(
    adminId,
    status === "REMOVED" ? "REMOVE_CONTENT" : "UPDATE_CONTENT_STATUS",
    contentType.toUpperCase(),
    contentId,
    { status, previousStatus, reason },
    ipAddress
  );
}

// ─── Report management ────────────────────────────────────────────────────────

export interface ReportListOptions {
  status?: "PENDING" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN";
  targetType?: string;
  page?: number;
  pageSize?: number;
}

export async function listReports(options: ReportListOptions = {}) {
  const { status, targetType, page = 1, pageSize = 20 } = options;
  const where = {
    ...(status && { status }),
    ...(targetType && { targetType }),
  };

  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        moderator: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: reports,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function processReport(
  adminId: string,
  reportId: string,
  status: "REVIEWED" | "DISMISSED" | "ACTION_TAKEN",
  note?: string,
  ipAddress?: string | null
): Promise<void> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw Object.assign(new Error("Report not found"), { status: 404 });

  await prisma.report.update({
    where: { id: reportId },
    data: { status, moderatorId: adminId, moderatorNote: note ?? null, resolvedAt: new Date() },
  });

  await writeAuditLog(adminId, "PROCESS_REPORT", "REPORT", reportId, {
    reportStatus: status, targetType: report.targetType, targetId: report.targetId, note,
  }, ipAddress);
}

// ─── Audit log listing ────────────────────────────────────────────────────────

export async function listAuditLogs(
  page = 1,
  pageSize = 50,
  actorId?: string,
  action?: string
) {
  const where = {
    ...(actorId && { actorId }),
    ...(action && { action }),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: logs,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
