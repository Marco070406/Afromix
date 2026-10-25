"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  message,
  onRetry,
}: ErrorStateProps) {
  const { tr } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertCircle className="h-8 w-8" />
      </div>
      <div>
        <p className="text-base font-medium text-zinc-300">{title ?? tr("Une erreur est survenue", "Something went wrong")}</p>
        <p className="mt-1 text-sm text-zinc-500">{message ?? tr("Impossible de charger les données.", "Couldn't load the data.")}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {tr("Réessayer", "Try again")}
        </Button>
      )}
    </div>
  );
}
