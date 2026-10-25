import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createBookingInquirySchema } from "@/lib/validations/user";
import { sendBookingInquiryEmail } from "@/lib/email";
import { ok, badRequest, notFound, serverError } from "@/lib/response";
import { rateLimit, clientIp } from "@/lib/redis";

// POST /api/v1/artists/[slug]/contact
// Permet à un utilisateur ou organisateur d'envoyer une demande de booking / contact au DJ
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;

  if (!(await rateLimit(`contact:${clientIp(request.headers)}`, 5, 60 * 60)).allowed) {
    return Response.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  try {
    const artist = await prisma.artistProfile.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        stageName: true,
        bookingEmail: true,
        availableForBooking: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!artist) {
      return notFound("DJ / Artiste introuvable");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Corps JSON invalide");
    }

    const parsed = createBookingInquirySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation error", parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const session = await getSession();

    // 1. Sauvegarder la demande en base
    const inquiry = await prisma.bookingInquiry.create({
      data: {
        artistId: artist.id,
        senderId: session?.sub || null,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderPhone: data.senderPhone || null,
        eventType: data.eventType,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        eventCity: data.eventCity || null,
        budget: data.budget || null,
        message: data.message,
        status: "PENDING",
      },
    });

    // 2. Créer une notification in-app pour le DJ
    try {
      await prisma.notification.create({
        data: {
          userId: artist.userId,
          type: "SYSTEM",
          title: `Nouvelle demande de booking de ${data.senderName}`,
          body: `Prestation ${data.eventType}${data.eventCity ? ` à ${data.eventCity}` : ""}. Cliquez pour voir les coordonnées.`,
          linkUrl: `/dashboard/profile`,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to create in-app notification:", notifErr);
    }

    // 3. Envoyer l'email au DJ (vers son bookingEmail ou son email de compte)
    const targetEmail = artist.bookingEmail || artist.user.email;
    if (targetEmail) {
      try {
        await sendBookingInquiryEmail(targetEmail, artist.stageName, {
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          senderPhone: data.senderPhone,
          eventType: data.eventType,
          eventDate: data.eventDate || null,
          eventCity: data.eventCity || null,
          budget: data.budget || null,
          message: data.message,
        });
      } catch (emailErr) {
        console.warn("Failed to send booking email:", emailErr);
      }
    }

    return ok({
      id: inquiry.id,
      message: "Votre message a été transmis avec succès au DJ !",
    });
  } catch (err) {
    console.error("[POST /api/v1/artists/[slug]/contact]", err);
    return serverError();
  }
}
