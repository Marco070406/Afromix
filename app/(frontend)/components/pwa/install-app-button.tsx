"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, PlusSquare, Share, X, MonitorDown } from "lucide-react";
import { toast } from "sonner";
import { initPwa, promptInstall, useInstallMode } from "@/app/(frontend)/lib/pwa";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";
import { cn } from "@/app/(frontend)/lib/utils";

/** Monté une fois dans le layout : capture l'invite d'installation et enregistre le service worker. */
export function PwaInit() {
  useEffect(() => {
    initPwa();
  }, []);
  return null;
}

type Variant = "sidebar" | "sidebar-collapsed" | "menu" | "card";

/**
 * Bouton « Installer l'app ». Invite native quand le navigateur la propose (Chrome, Edge,
 * Android) ; instructions pas à pas sur iPhone/iPad et Mac Safari ; masqué si l'app est
 * déjà installée ou si le navigateur ne permet pas l'installation.
 */
export function InstallAppButton({ variant, onDone }: { variant: Variant; onDone?: () => void }) {
  const { tr } = useI18n();
  const mode = useInstallMode();
  const [showHelp, setShowHelp] = useState(false);

  if (mode === "installed" || mode === "unavailable") return null;

  const label = tr("Installer l'app", "Install the app");

  const handleClick = async () => {
    if (mode === "prompt") {
      const accepted = await promptInstall();
      if (accepted) toast.success(tr("AfroMix est installé sur votre appareil !", "AfroMix is installed on your device!"));
      onDone?.();
    } else {
      setShowHelp(true);
    }
  };

  const button =
    variant === "card" ? (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 h-10 text-sm font-semibold text-white shadow-lg shadow-brand/20"
      >
        <Download className="h-4 w-4" />
        {label}
      </button>
    ) : variant === "sidebar-collapsed" ? (
      <button
        type="button"
        onClick={handleClick}
        title={label}
        aria-label={label}
        className="h-10 w-10 mx-auto rounded-xl bg-surface hover:bg-surface-2 border border-line flex items-center justify-center text-brand transition-colors"
      >
        <Download className="h-4 w-4" />
      </button>
    ) : (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl border text-left transition-colors",
          variant === "menu" ? "px-3 py-3 bg-surface-2 border-line-strong" : "px-3 py-2.5 bg-surface border-line hover:bg-surface-2"
        )}
      >
        <span className="h-9 w-9 rounded-lg bg-brand-gradient flex items-center justify-center flex-shrink-0">
          <Download className="h-4 w-4 text-white" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">{label}</span>
          <span className="block text-xs text-subtle truncate">
            {tr("Accès direct depuis votre écran d'accueil", "One tap from your home screen")}
          </span>
        </span>
      </button>
    );

  return (
    <>
      {button}
      {/* Portail vers <body> : dans le menu mobile (animé et défilant), une fenêtre fixe
          serait sinon enfermée et coupée par son conteneur */}
      {showHelp &&
        createPortal(<InstallHelp mode={mode} onClose={() => { setShowHelp(false); onDone?.(); }} />, document.body)}
    </>
  );
}

function InstallHelp({ mode, onClose }: { mode: "ios" | "macos-safari" | "prompt"; onClose: () => void }) {
  const { tr } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps =
    mode === "ios"
      ? [
          { icon: Share, text: tr("Touchez le bouton Partager en bas de Safari.", "Tap the Share button at the bottom of Safari.") },
          { icon: PlusSquare, text: tr("Choisissez « Sur l'écran d'accueil ».", "Choose “Add to Home Screen”.") },
          { icon: Download, text: tr("Touchez « Ajouter » : AfroMix apparaît parmi vos apps.", "Tap “Add”: AfroMix appears with your apps.") },
        ]
      : [
          { icon: MonitorDown, text: tr("Dans la barre de menus de Safari, ouvrez « Fichier ».", "In Safari's menu bar, open “File”.") },
          { icon: PlusSquare, text: tr("Choisissez « Ajouter au Dock ».", "Choose “Add to Dock”.") },
          { icon: Download, text: tr("Confirmez : AfroMix s'ouvre comme une application.", "Confirm: AfroMix opens like an app.") },
        ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-surface border border-line-strong p-6 shadow-2xl animate-fade-in-up"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <AfromixSymbol size={40} />
            <h2 id="install-help-title" className="text-lg font-bold text-white">
              {tr("Installer AfroMix", "Install AfroMix")}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={tr("Fermer", "Close")} className="text-subtle hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-4">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-surface-3 border border-line-strong flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-brand" />
              </span>
              <span className="text-sm text-zinc-200">{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-subtle">
          {tr("Aucune boutique d'applications : l'installation est gratuite et se fait depuis le navigateur.", "No app store needed: installing is free and happens in your browser.")}
        </p>
      </div>
    </div>
  );
}

/** Section des Paramètres : toujours visible, adaptée à l'état d'installation. */
export function InstallAppSection() {
  const { tr } = useI18n();
  const mode = useInstallMode();

  return (
    <div className="rounded-3xl bg-surface border border-line p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-line">
        <AfromixSymbol size={40} />
        <div>
          <h2 className="text-base font-bold text-white">{tr("Application AfroMix", "AfroMix app")}</h2>
          <p className="text-xs text-muted">
            {tr("Installez AfroMix comme une app, sans passer par une boutique.", "Install AfroMix like an app, no app store needed.")}
          </p>
        </div>
      </div>
      {mode === "installed" ? (
        <p className="text-sm text-emerald-400">{tr("AfroMix est installé sur cet appareil.", "AfroMix is installed on this device.")}</p>
      ) : mode === "unavailable" ? (
        <p className="text-sm text-muted">
          {tr(
            "Ce navigateur ne propose pas l'installation. Ouvrez AfroMix dans Chrome, Edge (ordinateur, Android) ou Safari (iPhone, iPad, Mac).",
            "This browser doesn't offer installation. Open AfroMix in Chrome, Edge (desktop, Android) or Safari (iPhone, iPad, Mac)."
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted max-w-sm">
            {tr(
              "Lancement depuis l'écran d'accueil, plein écran, sans barre de navigateur.",
              "Launch from your home screen, full screen, without the browser bar."
            )}
          </p>
          <InstallAppButton variant="card" />
        </div>
      )}
    </div>
  );
}
