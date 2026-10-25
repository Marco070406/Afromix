import type { Metadata, Viewport } from "next";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "./components/layout/sidebar";
import { Header } from "./components/layout/header";
import { PlayerBar } from "./components/player/player-bar";
import { BottomNav } from "./components/layout/bottom-nav";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "AfroMix — Streaming musical africain", template: "%s · AfroMix" },
  description: "La plateforme des DJs et artistes africains. Découvrez les meilleurs mixes Afrobeats, Amapiano, Afro House et plus encore.",
  keywords: ["afrobeats", "amapiano", "afro house", "DJ", "streaming", "africain", "musique"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "AfroMix",
    title: "AfroMix — Streaming musical africain",
    description: "La plateforme des DJs et artistes africains.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${bricolage.variable} h-full`} suppressHydrationWarning>
      <body className="h-full bg-bg text-white antialiased overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          <div className="flex h-full min-h-0">
            {/* Sidebar desktop */}
            <Sidebar />

            {/* Main content + player stacked vertically */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full">
              <Header />
              <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0">
                {children}
              </main>

              {/* Player & nav are in-flow, stacked below main */}
              <PlayerBar />
              <BottomNav />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
