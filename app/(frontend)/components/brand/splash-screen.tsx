"use client";

import { useEffect, useState } from "react";
import { AfromixSymbol } from "./afromix-logo";

// Durée minimale d'affichage (depuis le début de la navigation) pour éviter un flash
const MIN_VISIBLE_MS = 500;
// Filet de sécurité si l'événement « load » tarde (ressource lente, réseau mobile)
const MAX_WAIT_MS = 4000;
const FADE_MS = 400;

/**
 * Écran de chargement affiché à l'ouverture du site.
 * Rendu côté serveur : il apparaît avant même l'exécution du JavaScript, puis
 * disparaît en fondu une fois la page chargée. Monté une seule fois dans le layout,
 * il ne réapparaît pas lors des navigations internes.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    let leaveTimer: ReturnType<typeof setTimeout>;
    let goneTimer: ReturnType<typeof setTimeout>;

    const leave = () => {
      const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
      leaveTimer = setTimeout(() => {
        setPhase("leaving");
        goneTimer = setTimeout(() => setPhase("gone"), FADE_MS);
      }, wait);
    };

    const fallback = setTimeout(leave, MAX_WAIT_MS);
    const onLoad = () => {
      clearTimeout(fallback);
      leave();
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      clearTimeout(fallback);
      clearTimeout(leaveTimer);
      clearTimeout(goneTimer);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      // Rendu hors du fournisseur de langue (avant son montage) : libellé bilingue
      aria-label="AfroMix — chargement / loading"
      aria-live="polite"
      className={`splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-bg transition-opacity ease-out ${
        phase === "leaving" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="relative flex items-center justify-center">
        {/* Halo dégradé qui pulse derrière le symbole */}
        <div className="splash-glow absolute h-40 w-40 rounded-full bg-brand-gradient blur-3xl" />
        <AfromixSymbol size={96} className="splash-symbol relative" />
      </div>

      {/* Barres d'égaliseur : rappel des dents du peigne */}
      <div className="flex h-6 items-end gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="splash-bar w-1.5 rounded-full bg-brand-gradient" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </div>
  );
}
