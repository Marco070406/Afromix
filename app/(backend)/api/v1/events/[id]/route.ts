import { ok, notFound, forbidden, unauthorized, badRequest, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEventRejectionEmail, sendEventApprovalEmail } from "@/lib/email";
import { notifyFollowersNewEvent } from "@/services/notifications";
import type { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET /api/v1/events/[id] ──────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteParams): Promise<Response> {
  const { id } = await params;
  try {
    const session = await getSession();

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            slug: true,
            stageName: true,
            avatarUrl: true,
            country: true,
            bio: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!event) return notFound("Événement introuvable");

    // Si l'événement n'est pas approuvé, seuls les admins et le créateur peuvent le voir
    if (event.status !== "APPROVED") {
      const isAdmin = session?.role === "ADMIN";
      const isOwner = session && event.createdById === session.sub;
      if (!isAdmin && !isOwner) {
        return notFound("Événement introuvable");
      }
    }

    return ok(event);
  } catch (err) {
    console.error("[GET /api/v1/events/[id]]", err);
    return serverError();
  }
}

// ─── PATCH /api/v1/events/[id] ────────────────────────────────────────────────
// Modération admin : APPROVE ou REJECT avec motif obligatoire
const moderateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
  }),
  z.object({
    action: z.literal("REJECT"),
    reason: z.string().min(3, "Veuillez préciser un motif de refus (minimum 3 caractères)"),
  }),
]);

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  // Seul l'ADMIN peut modérer
  if (session.role !== "ADMIN") {
    return forbidden("Action réservée aux administrateurs");
  }

  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!event) return notFound("Événement introuvable");

    const body = await req.json();
    const parsed = moderateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation error", parsed.error.flatten().fieldErrors);
    }

    const { action } = parsed.data;

    if (action === "APPROVE") {
      const updated = await prisma.event.update({
        where: { id },
        data: {
          status: "APPROVED",
          rejectionReason: null,
        },
        include: {
          artist: {
            select: {
              id: true,
              slug: true,
              stageName: true,
              avatarUrl: true,
              country: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      });

      // Notification in-app au créateur
      if (event.createdById) {
        await prisma.notification.create({
          data: {
            userId: event.createdById,
            type: "SYSTEM",
            title: "Événement validé !",
            body: `Votre événement « ${event.title} » a été validé par l'équipe AfroMix et est maintenant en ligne.`,
            linkUrl: `/events`,
          },
        }).catch((e) => console.error("[Notification error]", e));

        // Envoi d'un email de confirmation
        if (event.createdBy?.email) {
          const name = event.createdBy.profile?.displayName || "Artiste";
          sendEventApprovalEmail(event.createdBy.email, name, event.title).catch((e) =>
            console.error("[Email approval error]", e)
          );
        }
      }

      // Notifier tous les abonnés du DJ de la programmation de cet événement
      if (updated.artistId) {
        const artist = await prisma.artistProfile.findUnique({
          where: { id: updated.artistId },
          select: { userId: true, stageName: true, avatarUrl: true },
        });
        if (artist) {
          notifyFollowersNewEvent(
            artist.userId,
            artist.stageName,
            artist.avatarUrl,
            updated.title,
            updated.city,
            updated.id
          ).catch((e) => console.error("[Followers event notification error]", e));
        }
      }

      return ok(updated);
    } else {
      // action === "REJECT"
      const reason = parsed.data.reason.trim();

      const updated = await prisma.event.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
        },
        include: {
          artist: {
            select: {
              id: true,
              slug: true,
              stageName: true,
              avatarUrl: true,
              country: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      });

      // Notification in-app au créateur avec le motif
      if (event.createdById) {
        await prisma.notification.create({
          data: {
            userId: event.createdById,
            type: "SYSTEM",
            title: "Événement refusé",
            body: `Votre événement « ${event.title} » a été refusé. Motif : ${reason}`,
            linkUrl: `/events`,
          },
        }).catch((e) => console.error("[Notification error]", e));

        // Envoi d'un email explicatif avec le motif
        if (event.createdBy?.email) {
          const name = event.createdBy.profile?.displayName || "Artiste";
          sendEventRejectionEmail(event.createdBy.email, name, event.title, reason).catch((e) =>
            console.error("[Email rejection error]", e)
          );
        }
      }

      return ok(updated);
    }
  } catch (err) {
    console.error("[PATCH /api/v1/events/[id]]", err);
    return serverError();
  }
}

// ─── DELETE /api/v1/events/[id] ───────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) return notFound("Event not found");

    // Admin can delete any event
    // Artist can delete events they created
    const isAdmin = session.role === "ADMIN";
    const isOwner = event.createdById === session.sub;

    if (!isAdmin && !isOwner) {
      return forbidden("You are not authorized to delete this event");
    }

    await prisma.event.delete({
      where: { id },
    });

    return ok({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("[DELETE /api/v1/events/[id]]", err);
    return serverError();
  }
}
