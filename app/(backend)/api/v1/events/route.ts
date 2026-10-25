import { ok, created, unauthorized, forbidden, badRequest, serverError } from "@/lib/response";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyFollowersNewEvent } from "@/services/notifications";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { httpUrl, imageUrl } from "@/lib/validations/common";

// ─── GET /api/v1/events ───────────────────────────────────────────────────────
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get("status");

    let whereClause: Prisma.EventWhereInput = { status: "APPROVED" };

    if (session?.role === "ADMIN") {
      // L'admin peut filtrer par statut ou tout voir
      if (requestedStatus && ["PENDING", "APPROVED", "REJECTED"].includes(requestedStatus)) {
        whereClause = { status: requestedStatus as "PENDING" | "APPROVED" | "REJECTED" };
      } else if (requestedStatus === "ALL") {
        whereClause = {};
      } else {
        // Par défaut pour l'admin, voir tous les événements
        whereClause = {};
      }
    } else if (session?.role === "ARTIST") {
      // Un artiste voit tous les événements approuvés + ses propres événements (même en attente ou rejetés)
      whereClause = {
        OR: [
          { status: "APPROVED" },
          { createdById: session.sub },
        ],
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { startAt: "asc" },
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

    return ok(events);
  } catch (err) {
    console.error("[GET /api/v1/events]", err);
    return serverError();
  }
}

// ─── POST /api/v1/events ──────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(200),
  description: z.string().max(2000).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  startAt: z.string().min(1, "La date de début est requise"),
  endAt: z.string().optional().nullable(),
  ticketUrl: httpUrl().optional().nullable().or(z.literal("")),
  coverUrl: imageUrl().optional().nullable().or(z.literal("")),
  artistId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return unauthorized();

  // Seuls les ARTIST et ADMIN peuvent créer des événements
  if (session.role !== "ARTIST" && session.role !== "ADMIN") {
    return forbidden("Only artists and admins can create events");
  }

  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const startDate = new Date(data.startAt);
    if (isNaN(startDate.getTime())) {
      return badRequest("Date de début invalide");
    }

    const endDate = data.endAt ? new Date(data.endAt) : null;
    if (endDate && isNaN(endDate.getTime())) {
      return badRequest("Date de fin invalide");
    }

    // Si ARTIST, lier automatiquement à son profil artiste
    let artistId: string | null = null;
    const isDJ = session.role === "ARTIST";

    if (isDJ) {
      const profile = await prisma.artistProfile.findUnique({
        where: { userId: session.sub },
        select: { id: true },
      });
      if (!profile) {
        return forbidden("Artist profile not found");
      }
      artistId = profile.id;
    } else if (session.role === "ADMIN") {
      // L'admin peut soit associer un DJ (artistId), soit créer un événement général
      if (data.artistId) {
        const artistProfile = await prisma.artistProfile.findUnique({
          where: { id: data.artistId },
          select: { id: true },
        });
        if (artistProfile) {
          artistId = artistProfile.id;
        }
      }
    }

    // Règle de modération :
    // Si créé par l'ADMIN -> direct APPROVED
    // Si créé par le DJ -> PENDING (doit être validé par un admin)
    const eventStatus = session.role === "ADMIN" ? "APPROVED" : "PENDING";

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description || null,
        venue: data.venue || null,
        city: data.city || null,
        country: data.country || null,
        startAt: startDate,
        endAt: endDate,
        ticketUrl: data.ticketUrl || null,
        coverUrl: data.coverUrl || null,
        artistId,
        createdById: session.sub,
        status: eventStatus,
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

    // Si créé directement en APPROVED (par l'ADMIN) avec un DJ associé, notifier les followers
    if (event.status === "APPROVED" && event.artistId) {
      const artist = await prisma.artistProfile.findUnique({
        where: { id: event.artistId },
        select: { userId: true, stageName: true, avatarUrl: true },
      });
      if (artist) {
        notifyFollowersNewEvent(
          artist.userId,
          artist.stageName,
          artist.avatarUrl,
          event.title,
          event.city,
          event.id
        ).catch((e) => console.error("[Followers direct event notification error]", e));
      }
    }

    return created(event);
  } catch (err) {
    console.error("[POST /api/v1/events]", err);
    return serverError();
  }
}
