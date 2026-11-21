"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { mixShareUrl, parseTimeParam, timestamp } from "@/app/(frontend)/lib/time-param";
import { cn } from "@/app/(frontend)/lib/utils";

interface ShareMixDialogProps {
  mix: { slug: string; title: string; durationSec: number | null };
  /** Position proposée par défaut (lecture en cours), ou null */
  defaultSec: number | null;
  onClose: () => void;
}

/** Partage d'un mix, avec un instant de départ facultatif (lien « ?t= »). */
export function ShareMixDialog({ mix, defaultSec, onClose }: ShareMixDialogProps) {
  const { tr } = useI18n();
  const ids = useId();
  const proposed = defaultSec && defaultSec >= 1 ? Math.floor(defaultSec) : 0;
  const [withTime, setWithTime] = useState(proposed > 0);
  const [timeText, setTimeText] = useState(timestamp(proposed));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const seconds = parseTimeParam(timeText);
  const tooLate = seconds !== null && !!mix.durationSec && seconds >= mix.durationSec;
  const invalid = withTime && (seconds === null || tooLate);
  const url = mixShareUrl(window.location.origin, mix.slug, withTime && !invalid ? seconds : null);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(tr("Lien copié !", "Link copied!"));
    } catch {
      toast.error(tr("Copie impossible : sélectionnez le lien à la main", "Could not copy: select the link manually"));
    }
  };

  const nativeShare = () => {
    navigator.share({ title: mix.title, url }).catch(() => {});
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-surface border border-line-strong p-6 shadow-2xl animate-fade-in-up space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${ids}-title`} className="text-lg font-bold text-white">{tr("Partager le mix", "Share the mix")}</h2>
            <p className="text-sm text-muted truncate">{mix.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Fermer", "Close")} className="text-subtle hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={withTime}
              onChange={(e) => { setWithTime(e.target.checked); setCopied(false); }}
              className="h-4 w-4 accent-purple-500"
            />
            {tr("Commencer à", "Start at")}
            <input
              type="text"
              inputMode="numeric"
              value={timeText}
              onChange={(e) => { setTimeText(e.target.value); setWithTime(true); setCopied(false); }}
              aria-label={tr("Instant de départ (minutes:secondes)", "Start time (minutes:seconds)")}
              aria-invalid={invalid}
              className={cn(
                "w-24 h-9 rounded-lg bg-surface-2 border px-2 text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-purple-500/40",
                invalid ? "border-red-500/60" : "border-line"
              )}
            />
          </label>
          {invalid && (
            <p className="text-xs text-red-400">
              {tooLate
                ? tr(`Le mix dure ${timestamp(mix.durationSec!)}.`, `The mix lasts ${timestamp(mix.durationSec!)}.`)
                : tr("Format attendu : 12:30 ou 1:02:05", "Expected format: 12:30 or 1:02:05")}
            </p>
          )}
        </div>

        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={tr("Lien à partager", "Link to share")}
          className="w-full h-10 rounded-xl bg-surface-2 border border-line px-3 text-xs text-muted"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={invalid}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 h-10 text-sm font-semibold text-white disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? tr("Copié", "Copied") : tr("Copier le lien", "Copy link")}
          </button>
          {canNativeShare && (
            <button
              type="button"
              onClick={nativeShare}
              disabled={invalid}
              className="inline-flex items-center gap-2 rounded-full bg-surface-2 border border-line px-5 h-10 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              {tr("Partager…", "Share…")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
