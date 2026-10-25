import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "NEW_FOLLOWER"
  | "NEW_LIKE"
  | "NEW_COMMENT"
  | "NEW_MIX"
  | "NEW_TRACK"
  | "SYSTEM";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Crée une notification. Non-bloquant — les erreurs sont silencieuses
 * pour ne pas impacter le flux principal (like, follow, etc.).
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    // Ne pas notifier quelqu'un de ses propres actions
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
      },
    });
  } catch {
    // Non-bloquant : une notif ratée ne doit pas faire échouer l'action
  }
}

// ─── Helpers de création par type ────────────────────────────────────────────

export async function notifyNewFollower(
  targetUserId: string,
  followerDisplayName: string,
  followerAvatarUrl: string | null,
  followerProfileUrl: string
): Promise<void> {
  await createNotification({
    userId: targetUserId,
    type: "NEW_FOLLOWER",
    title: `${followerDisplayName} te suit maintenant`,
    imageUrl: followerAvatarUrl ?? undefined,
    linkUrl: followerProfileUrl,
  });
}

export async function notifyNewLike(
  contentOwnerUserId: string,
  likerDisplayName: string,
  likerAvatarUrl: string | null,
  contentTitle: string,
  contentUrl: string
): Promise<void> {
  await createNotification({
    userId: contentOwnerUserId,
    type: "NEW_LIKE",
    title: `${likerDisplayName} a aimé "${contentTitle}"`,
    imageUrl: likerAvatarUrl ?? undefined,
    linkUrl: contentUrl,
  });
}

export async function notifyNewComment(
  contentOwnerUserId: string,
  commenterDisplayName: string,
  commenterAvatarUrl: string | null,
  contentTitle: string,
  contentUrl: string,
  commentPreview: string
): Promise<void> {
  await createNotification({
    userId: contentOwnerUserId,
    type: "NEW_COMMENT",
    title: `${commenterDisplayName} a commenté "${contentTitle}"`,
    body: commentPreview.slice(0, 100),
    imageUrl: commenterAvatarUrl ?? undefined,
    linkUrl: contentUrl,
  });
}

/**
 * Notifie tous les followers d'un artiste qu'il a publié un nouveau mix.
 * Traité par lot pour éviter de surcharger la DB.
 */
export async function notifyFollowersNewMix(
  artistUserId: string,
  stageName: string,
  avatarUrl: string | null,
  mixTitle: string,
  mixSlug: string
): Promise<void> {
  const linkUrl = `/mixes/${mixSlug}`;

  // Récupère les followers par lots de 100
  const BATCH = 100;
  let cursor: string | undefined;

  do {
    const follows = await prisma.follow.findMany({
      where: { followingId: artistUserId },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, followerId: true },
      orderBy: { id: "asc" },
    });

    if (follows.length === 0) break;

    await prisma.notification.createMany({
      data: follows.map((f: { id: string; followerId: string }) => ({
        userId: f.followerId,
        type: "NEW_MIX" as const,
        title: `${stageName} vient de publier "${mixTitle}"`,
        imageUrl: avatarUrl ?? undefined,
        linkUrl,
      })),
      skipDuplicates: true,
    });

    cursor = follows.length === BATCH ? follows[follows.length - 1].id : undefined;
  } while (cursor);
}

export async function notifyFollowersNewTrack(
  artistUserId: string,
  stageName: string,
  avatarUrl: string | null,
  trackTitle: string,
  trackSlug: string
): Promise<void> {
  const linkUrl = `/tracks/${trackSlug}`;
  const BATCH = 100;
  let cursor: string | undefined;

  do {
    const follows = await prisma.follow.findMany({
      where: { followingId: artistUserId },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, followerId: true },
      orderBy: { id: "asc" },
    });

    if (follows.length === 0) break;

    await prisma.notification.createMany({
      data: follows.map((f: { id: string; followerId: string }) => ({
        userId: f.followerId,
        type: "NEW_TRACK" as const,
        title: `${stageName} vient de publier "${trackTitle}"`,
        imageUrl: avatarUrl ?? undefined,
        linkUrl,
      })),
      skipDuplicates: true,
    });

    cursor = follows.length === BATCH ? follows[follows.length - 1].id : undefined;
  } while (cursor);
}

export async function notifyFollowersNewEvent(
  artistUserId: string,
  stageName: string,
  avatarUrl: string | null,
  eventTitle: string,
  eventCity?: string | null,
  eventId?: string
): Promise<void> {
  const linkUrl = eventId ? `/events/${eventId}` : `/events`;
  const BATCH = 100;
  let cursor: string | undefined;
  const locationText = eventCity ? ` à ${eventCity}` : "";

  do {
    const follows = await prisma.follow.findMany({
      where: { followingId: artistUserId },
      take: BATCH,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: { id: true, followerId: true },
      orderBy: { id: "asc" },
    });

    if (follows.length === 0) break;

    await prisma.notification.createMany({
      data: follows.map((f: { id: string; followerId: string }) => ({
        userId: f.followerId,
        type: "SYSTEM" as const,
        title: `Événement : ${stageName} sera en live !`,
        body: `${stageName} a annoncé « ${eventTitle} »${locationText}. Découvrez la date et réservez vos places !`,
        imageUrl: avatarUrl ?? undefined,
        linkUrl,
      })),
      skipDuplicates: true,
    });

    cursor = follows.length === BATCH ? follows[follows.length - 1].id : undefined;
  } while (cursor);
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listNotifications(
  userId: string,
  page = 1,
  pageSize = 20,
  unreadOnly = false
) {
  const where = {
    userId,
    ...(unreadOnly && { read: false }),
  };

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    items: notifications.map((n: typeof notifications[number]) => ({
      ...n,
      type: n.type as string,
      createdAt: n.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notif) return false;

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
  return true;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notif) return false;

  await prisma.notification.delete({ where: { id: notificationId } });
  return true;
}
