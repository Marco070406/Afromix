"use client";

import Link from "next/link";
import { Home, Search } from "lucide-react";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

export default function NotFound() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <div className="relative text-center max-w-md">
        <div className="flex justify-center mb-6">
          <AfromixSymbol size={80} />
        </div>

        <h1 className="text-7xl font-black text-white mb-2 tracking-tighter">404</h1>
        <p className="text-xl font-semibold text-zinc-300 mb-2">{tr("Page introuvable", "Page not found")}</p>
        <p className="text-sm text-zinc-500 mb-8">
          {tr("Cette page n'existe pas ou a été déplacée.", "This page doesn't exist or has moved.")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            {tr("Retour à l'accueil", "Back to home")}
          </Link>
          <Link
            href="/explore"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] border border-white/[0.10] text-white text-sm font-medium hover:bg-white/[0.10] transition-colors"
          >
            <Search className="h-4 w-4" />
            {tr("Explorer", "Explore")}
          </Link>
        </div>
      </div>
    </div>
  );
}
