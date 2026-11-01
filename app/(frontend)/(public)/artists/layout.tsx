import type { Metadata } from "next";

export const metadata: Metadata = {
  // Le modèle est répété ici : un titre simple l'annulerait pour les pages enfants
  title: { default: "DJs", template: "%s · AfroMix" },
  description: "Découvrez les DJs d'AfroMix et réservez-les pour vos événements.",
};

export default function ArtistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
