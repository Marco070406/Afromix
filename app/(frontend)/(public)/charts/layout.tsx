import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classements",
  description: "Le classement des DJs et des mixes sur AfroMix.",
};

export default function ChartsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
