import { useId } from "react";
import { cn } from "@/app/(frontend)/lib/utils";
import {
  SYMBOL_PATH,
  SYMBOL_SMALL_PATH,
  WORDMARK_AFRO_PATH,
  WORDMARK_MIX_PATH,
  WORDMARK_WIDTH,
} from "./afromix-paths";

// Dégradé de marque — mêmes valeurs que .bg-brand-gradient (globals.css)
const BRAND_FROM = "#9333EA";
const BRAND_TO = "#DB2777";

// Mise en page du logo horizontal (unités du symbole : cadre 256) — voir branding/logo/build_kit.py
const CAP_SCALE = 0.88; // capitales de 88 unités
const GAP = 14;
const BASELINE = 176;
const LOCKUP_WIDTH = 256 + GAP + WORDMARK_WIDTH * CAP_SCALE + 8;

type Tone = "brand" | "white" | "black";

function BrandGradient({ id, horizontal = false }: { id: string; horizontal?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2={horizontal ? "0.4" : "1"}>
      <stop offset="0" stopColor={BRAND_FROM} />
      <stop offset="1" stopColor={BRAND_TO} />
    </linearGradient>
  );
}

/**
 * Symbole AfroMix : l'Afrique en peigne afro.
 * `size` en pixels ; la version simplifiée (moins de dents) est utilisée à 32 px et moins.
 */
export function AfromixSymbol({
  size = 32,
  tone = "brand",
  className,
}: {
  size?: number;
  tone?: Tone;
  className?: string;
}) {
  // Un id par instance : un dégradé défini dans un SVG masqué (sidebar repliée,
  // header mobile en desktop…) ne serait pas résolu par les autres.
  const gradientId = useId();
  const fill = tone === "brand" ? `url(#${gradientId})` : tone === "white" ? "#fff" : "#000";

  return (
    <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden="true" className={cn("flex-shrink-0", className)}>
      {tone === "brand" && <defs><BrandGradient id={gradientId} /></defs>}
      <path fill={fill} d={size <= 32 ? SYMBOL_SMALL_PATH : SYMBOL_PATH} />
    </svg>
  );
}

/** Logo horizontal : symbole + « AfroMix » vectorisé (Afro clair, Mix en dégradé). */
export function AfromixLogo({
  height = 36,
  tone = "brand",
  className,
}: {
  height?: number;
  tone?: Tone;
  className?: string;
}) {
  const id = useId();
  const symbolFill = tone === "brand" ? `url(#${id}-s)` : tone === "black" ? "#000" : "#fff";
  const afroFill = tone === "black" ? "#000" : tone === "white" ? "#fff" : "#F5F5F7";
  const mixFill = tone === "brand" ? `url(#${id}-m)` : afroFill;

  return (
    <svg
      height={height}
      viewBox={`0 0 ${LOCKUP_WIDTH} 256`}
      role="img"
      aria-label="AfroMix"
      className={cn("flex-shrink-0", className)}
    >
      {tone === "brand" && (
        <defs>
          <BrandGradient id={`${id}-s`} />
          <BrandGradient id={`${id}-m`} horizontal />
        </defs>
      )}
      <path fill={symbolFill} d={SYMBOL_PATH} />
      <g transform={`translate(${256 + GAP} ${BASELINE}) scale(${CAP_SCALE})`}>
        <path fill={afroFill} d={WORDMARK_AFRO_PATH} />
        <path fill={mixFill} d={WORDMARK_MIX_PATH} />
      </g>
    </svg>
  );
}
