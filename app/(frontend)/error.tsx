"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const { tr } = useI18n();
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center py-24 px-4">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">{tr("Une erreur est survenue", "Something went wrong")}</h2>
        <p className="text-sm text-zinc-500 mb-6">{tr("Quelque chose s'est mal passé. Veuillez réessayer.", "Something went wrong. Please try again.")}</p>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.10] text-white text-sm font-medium hover:bg-white/[0.12] transition-colors mx-auto"
        >
          <RotateCcw className="h-4 w-4" />
          {tr("Réessayer", "Try again")}
        </button>
      </div>
    </div>
  );
}
