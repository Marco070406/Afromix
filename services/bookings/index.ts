import { prisma } from "@/lib/prisma";
import { sendBookingResponseEmail } from "@/lib/email";
import { createNotification } from "@/services/notifications";
import type { UpdateBookingInquiryInput } from "@/lib/validations/user";

export type BookingStatus = "PENDING" | "READ" | "ACCEPTED" | "DECLINED";

/** Statuts qui donnent une réponse à l'organisateur (e-mail et notification). */
const ANSWERS: ReadonlySet<BookingStatus> = new Set(["ACCEPTED", "DECLINED"]);

export interface SentInquiry {
  id: string;
  eventType: string;
  eventDate: string | null;
  eventCity: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  artist: { slug: string; stageName: string; avatarUrl: string | null };
}

/**
 * Change le statut d'une demande reçue par l'artiste connecté.
 * Une acceptation ou un refus (nouveau) prévient l'organisateur, avec le message éventuel du DJ.
 * Retourne null si la demande n'existe pas ou n'appartient pas à cet artiste.
 */
export async function updateInquiryStatus(
  artistUserId: string,
  inquiryId: string,
  input: UpdateBookingInquiryInput
): Promise<{ id: string; status: BookingStatus; notified: boolean } | null> {
  const inquiry = await prisma.bookingInquiry.findFirst({
    where: { id: inquiryId, artist: { userId: artistUserId } },
    select: {
      id: true,
      status: true,
      senderId: true,
      senderName: true,
      senderEmail: true,
      eventType: true,
      eventDate: true,
      artist: { select: { slug: true, stageName: true, avatarUrl: true } },
    },
  });
  if (!inquiry) return null;

  const previous = inquiry.status as BookingStatus;
  const updated = await prisma.bookingInquiry.update({
    where: { id: inquiry.id },
    data: { status: input.status },
    select: { id: true, status: true },
  });

  // Une même décision envoyée deux fois ne prévient pas deux fois
  const notify = ANSWERS.has(input.status) && input.status !== previous;
  if (notify) {
    const accepted = input.status === "ACCEPTED";
    const reply = input.reply?.trim() || null;

    // L'échec d'un envoi ne doit pas annuler la décision, déjà enregistrée
    const email = await sendBookingResponseEmail(inquiry.senderEmail, {
      senderName: inquiry.senderName,
      artistName: inquiry.artist.stageName,
      artistSlug: inquiry.artist.slug,
      accepted,
      reply,
      eventType: inquiry.eventType,
      eventDate: inquiry.eventDate,
    }).catch((err: unknown) => {
      console.error("[bookings] e-mail de réponse non envoyé", err);
      return { ok: false };
    });
    if (!email.ok) console.error("[bookings] e-mail de réponse non envoyé pour la demande", inquiry.id);

    if (inquiry.senderId) {
      await createNotification({
        userId: inquiry.senderId,
        type: "SYSTEM",
        title: accepted
          ? `${inquiry.artist.stageName} a accepté votre demande de booking`
          : `${inquiry.artist.stageName} a décliné votre demande de booking`,
        body: reply ?? undefined,
        imageUrl: inquiry.artist.avatarUrl ?? undefined,
        linkUrl: "/profile?tab=account",
      });
    }
  }

  return { id: updated.id, status: updated.status as BookingStatus, notified: notify };
}

/** Demandes envoyées par un utilisateur connecté, avec leur statut. */
export async function listSentInquiries(userId: string): Promise<SentInquiry[]> {
  const rows = await prisma.bookingInquiry.findMany({
    where: { senderId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      eventType: true,
      eventDate: true,
      eventCity: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      artist: { select: { slug: true, stageName: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => ({
    ...r,
    status: r.status as BookingStatus,
    eventDate: r.eventDate?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
