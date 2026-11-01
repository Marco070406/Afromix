import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: "Les conditions d'utilisation d'AfroMix.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
