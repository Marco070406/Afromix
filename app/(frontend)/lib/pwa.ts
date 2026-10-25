"use client";

import { useSyncExternalStore } from "react";

/**
 * État d'installation de l'application (PWA), partagé par tous les boutons « Installer ».
 *
 * L'événement `beforeinstallprompt` (Chrome, Edge, Android) peut arriver avant le montage
 * des boutons : il est capturé une fois pour toutes par `initPwa()` (appelé dans le layout)
 * et conservé ici. Safari (iPhone, iPad, Mac) n'a pas d'invite programmable : on y affiche
 * des instructions à la place.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode =
  | "installed" // déjà ouvert comme application
  | "prompt" // invite native disponible
  | "ios" // iPhone / iPad : Partager → Sur l'écran d'accueil
  | "macos-safari" // Mac Safari : Fichier → Ajouter au Dock
  | "unavailable"; // navigateur sans installation (ou critères pas encore remplis)

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let initialized = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectMode(): InstallMode {
  if (installed || isStandalone()) return "installed";
  if (deferredPrompt) return "prompt";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  const isSafari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
  if (isSafari && ua.includes("Macintosh")) return "macos-safari";
  return "unavailable";
}

/** À appeler une fois au chargement : capture l'invite et enregistre le service worker. */
export function initPwa() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on garde l'invite pour notre propre bouton
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", notify);

  if ("serviceWorker" in navigator) {
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    } else {
      // En développement, un service worker resté actif servirait des fichiers périmés
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
  }
}

/** Ouvre l'invite native. Retourne true si l'utilisateur a accepté. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null; // une invite ne peut servir qu'une fois
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome === "accepted";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Mode d'installation courant ; "unavailable" au rendu serveur. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, detectMode, () => "unavailable");
}
