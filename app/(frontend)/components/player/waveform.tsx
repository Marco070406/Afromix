"use client";

import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mixesApi } from "@/app/(frontend)/lib/api/mixes";
import { resampleWaveform } from "@/app/(frontend)/lib/waveform";
import { timestamp } from "@/app/(frontend)/lib/time-param";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import type { PlayerTrack } from "@/app/(frontend)/providers/player-provider";
import { cn } from "@/app/(frontend)/lib/utils";

/** Forme d'onde du titre en cours ; vide pour un morceau ou un mix qui n'en a pas encore. */
export function useTrackWaveform(track: PlayerTrack | null): number[] {
  const isMix = track?.type === "mix";
  const { data } = useQuery({
    queryKey: ["mix", track?.slug],
    queryFn: () => mixesApi.getBySlug(track!.slug),
    enabled: isMix,
    staleTime: 5 * 60 * 1000,
  });
  const mix = data?.data;
  return isMix && mix?.id === track?.id ? mix.waveform ?? [] : [];
}

interface WaveformProps {
  values: number[];
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** Nombre de barres affichées (les 500 valeurs sont regroupées) */
  bars?: number;
  className?: string;
}

const KEY_STEP_SEC = 5;

/** Forme d'onde cliquable : partie écoutée en dégradé, survol avec l'instant, flèches du clavier. */
export function Waveform({ values, currentTime, duration, onSeek, bars = 120, className }: WaveformProps) {
  const { tr } = useI18n();
  const gradientId = useId();
  const clipId = useId();
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null);
  const shown = useMemo(() => resampleWaveform(values, bars), [values, bars]);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const n = shown.length;

  const timeAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return { x: e.clientX - rect.left, time: fraction * duration };
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") onSeek(Math.min(duration, currentTime + KEY_STEP_SEC));
    else if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - KEY_STEP_SEC));
    else return;
    e.preventDefault();
    // Sinon le raccourci global du lecteur (±10 s) s'ajouterait à ce pas de 5 s
    e.stopPropagation();
  };

  const bar = (v: number, i: number) => {
    const h = Math.max(4, v);
    return <rect key={i} x={i + 0.18} y={(100 - h) / 2} width={0.64} height={h} rx={0.3} />;
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={tr("Position dans le mix", "Position in the mix")}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={timestamp(currentTime)}
      onClick={(e) => duration > 0 && onSeek(timeAt(e).time)}
      onMouseMove={(e) => duration > 0 && setHover(timeAt(e))}
      onMouseLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      className={cn("relative cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 rounded", className)}
    >
      <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="h-full w-full block" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="60%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F5B83D" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={progress * n} height={100} />
          </clipPath>
        </defs>
        <g fill="rgba(255,255,255,0.22)">{shown.map(bar)}</g>
        <g fill={`url(#${gradientId})`} clipPath={`url(#${clipId})`}>{shown.map(bar)}</g>
      </svg>
      {hover && (
        <>
          <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/60" style={{ left: hover.x }} />
          <span
            className="pointer-events-none absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-zinc-800 text-[11px] text-white shadow-lg tabular-nums"
            style={{ left: hover.x }}
          >
            {timestamp(hover.time)}
          </span>
        </>
      )}
    </div>
  );
}
