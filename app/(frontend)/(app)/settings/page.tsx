"use client";

import { useState } from "react";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { Globe, Bell, Headphones, Check } from "lucide-react";
import { toast } from "sonner";
import { InstallAppSection } from "@/app/(frontend)/components/pwa/install-app-button";

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n();

  const [audioQuality, setAudioQuality] = useState<"HQ" | "STANDARD" | "ECO">("HQ");
  const [notifyNewMixes, setNotifyNewMixes] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyComments, setNotifyComments] = useState(false);

  const handleSave = () => {
    toast.success(t("settings.saved"));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span>{t("settings.title")}</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">{t("settings.subtitle")}</p>
      </div>

      <div className="space-y-6">
        {/* Section 0 : application installable (PWA) */}
        <InstallAppSection />

        {/* Section 1: Langue & Région */}
        <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t("settings.language")}</h2>
              <p className="text-xs text-zinc-400">{t("settings.languageDesc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setLanguage("fr");
                toast.success(t("settings.langSwitchedFr"));
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                language === "fr"
                  ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/10"
                  : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2"><span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-surface-3 border border-line-strong text-[10px] font-bold tracking-wide">FR</span>Français</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t("settings.langDefault")}</p>
              </div>
              {language === "fr" && <Check className="h-5 w-5 text-purple-400" />}
            </button>

            <button
              onClick={() => {
                setLanguage("en");
                toast.success(t("settings.langSwitchedEn"));
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                language === "en"
                  ? "bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/10"
                  : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <div>
                <p className="font-bold text-sm text-white flex items-center gap-2"><span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-surface-3 border border-line-strong text-[10px] font-bold tracking-wide">EN</span>English</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t("settings.langInternational")}</p>
              </div>
              {language === "en" && <Check className="h-5 w-5 text-purple-400" />}
            </button>
          </div>
        </div>

        {/* Section 2: Qualité audio streaming */}
        <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
            <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t("settings.audioQuality")}</h2>
              <p className="text-xs text-zinc-400">{t("settings.audioQualityDesc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {[
              { id: "HQ", title: t("settings.audioHQ"), desc: t("settings.audioHQDesc"), badge: t("settings.recommended") },
              { id: "STANDARD", title: t("settings.audioStandard"), desc: t("settings.audioStandardDesc"), badge: null },
              { id: "ECO", title: t("settings.audioEco"), desc: t("settings.audioEcoDesc"), badge: null },
            ].map((q) => (
              <button
                key={q.id}
                onClick={() => setAudioQuality(q.id as "HQ" | "STANDARD" | "ECO")}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  audioQuality === q.id
                    ? "bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/80 text-white shadow-lg"
                    : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-white">{q.title}</p>
                  {q.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                      {q.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">{q.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Notifications */}
        <div className="rounded-3xl bg-[#111318] border border-white/[0.08] p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t("settings.notifications")}</h2>
              <p className="text-xs text-zinc-400">{t("settings.notificationsDesc")}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                id: "mixes",
                label: t("settings.notifyMixes"),
                checked: notifyNewMixes,
                toggle: () => setNotifyNewMixes(!notifyNewMixes),
              },
              {
                id: "events",
                label: t("settings.notifyEvents"),
                checked: notifyEvents,
                toggle: () => setNotifyEvents(!notifyEvents),
              },
              {
                id: "comments",
                label: t("settings.notifyComments"),
                checked: notifyComments,
                toggle: () => setNotifyComments(!notifyComments),
              },
            ].map((n) => (
              <div
                key={n.id}
                onClick={n.toggle}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] cursor-pointer transition-colors"
              >
                <span className="text-sm text-zinc-300 font-medium">{n.label}</span>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    n.checked ? "bg-purple-600" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      n.checked ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-full text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-purple-600/30"
          >
            {t("btn.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
