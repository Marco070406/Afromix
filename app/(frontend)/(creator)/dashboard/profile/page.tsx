"use client";

import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { DjProfileEditor } from "@/app/(frontend)/components/profile/dj-profile-editor";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function DjDashboardProfilePage() {
  const { language, tr } = useI18n();

  return (
    <RequireAuth role="ARTIST">
      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === "fr" ? "Retour au Dashboard" : "Back to Dashboard"}</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            <span>AfroMix Creator Studio</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {language === "fr" ? "Mon Profil DJ & Coordonnées" : "My DJ Profile & Contact Info"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            {language === "fr"
              ? tr("Gérez votre visibilité, vos genres musicaux, vos photos et vos canaux de booking officiels.", "Manage your visibility, music genres, photos and official booking channels.")
              : "Manage your visibility, musical genres, photos, and official booking channels."}
          </p>
        </div>

        <DjProfileEditor />
      </div>
    </RequireAuth>
  );
}
