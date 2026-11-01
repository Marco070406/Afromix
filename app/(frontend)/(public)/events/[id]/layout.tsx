import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// La page est un composant client : son titre et son aperçu de partage sont définis ici
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await prisma.event.findFirst({
      where: { id, status: "APPROVED" },
      select: { title: true, description: true, coverUrl: true, city: true },
    });
    if (!event) return { title: "Événement introuvable", robots: { index: false } };

    const description = event.description ?? `${event.title}${event.city ? ` à ${event.city}` : ""}, sur AfroMix.`;
    const images = event.coverUrl ? [event.coverUrl] : undefined;
    return {
      title: event.title,
      description,
      openGraph: { title: event.title, description, images },
      twitter: { card: "summary_large_image", title: event.title, description, images },
    };
  } catch {
    return {};
  }
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
