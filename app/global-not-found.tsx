import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import "./(frontend)/globals.css";
import { AfromixSymbol } from "./(frontend)/components/brand/afromix-logo";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Page introuvable · AfroMix",
  robots: { index: false },
};

// Adresses qui ne correspondent à aucune route : vrai statut 404, sans passer par loading.tsx.
// Hors du layout : pas de fournisseur de langue, le texte est donc dans les deux langues.
export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${geist.variable} ${bricolage.variable} h-full`}>
      <body className="h-full bg-bg text-white antialiased">
        <main className="min-h-full flex flex-col items-center justify-center gap-5 px-4 text-center">
          <AfromixSymbol size={72} />
          <h1 className="text-4xl font-black tracking-tight">Page introuvable</h1>
          <p className="text-muted">Cette page n&apos;existe pas. / This page does not exist.</p>
          <Link href="/" className="inline-flex items-center rounded-full bg-brand-gradient px-6 h-11 text-sm font-semibold text-white">
            Retour à l&apos;accueil / Back home
          </Link>
        </main>
      </body>
    </html>
  );
}
