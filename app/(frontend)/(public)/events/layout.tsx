import type { Metadata } from "next";

export const metadata: Metadata = {
  // Le modèle est répété ici : un titre simple l'annulerait pour les pages enfants
  title: { default: "Événements", template: "%s · AfroMix" },
  description: "Concerts, soirées et festivals des DJs d'AfroMix.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
