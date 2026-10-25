"use client";

import { useCallback, useSyncExternalStore } from "react";

// Événement interne : notifie les autres composants de l'onglet courant
// (l'événement "storage" natif ne se déclenche que dans les autres onglets).
const CHANGE_EVENT = "afromix:storage";

// Repli en mémoire quand localStorage est indisponible (navigation privée, quota…)
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

/**
 * Chaîne persistée dans localStorage, synchronisée entre composants et onglets.
 * Le rendu serveur et l'hydratation utilisent `fallback`, puis la valeur stockée
 * prend le relais — sans setState dans un useEffect.
 */
export function useStoredValue(key: string, fallback: string) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback
  );

  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // le repli mémoire suffit pour la session en cours
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key]
  );

  return [value, setValue] as const;
}
