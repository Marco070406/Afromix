import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorer",
  description: "Parcourez les mixes par genre, pays et type sur AfroMix.",
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
