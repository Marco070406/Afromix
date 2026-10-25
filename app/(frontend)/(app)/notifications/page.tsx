"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Heart,
  UserPlus,
  MessageCircle,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Disc3,
  Headphones,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { notificationsApi, type Notification } from "@/app/(frontend)/lib/api/notifications";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";
import { timeAgo, cn, stripEmoji } from "@/app/(frontend)/lib/utils";
import type { Translate } from "@/app/(frontend)/providers/i18n-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

type FilterTab = "ALL" | "UNREAD" | "MUSIC" | "SOCIAL" | "EVENTS";

const FILTER_TABS: Array<{ id: FilterTab; label: string; labelEn: string; icon: React.ElementType }> = [
  { id: "ALL", label: "Toutes", labelEn: "All", icon: Bell },
  { id: "UNREAD", label: "Non lues", labelEn: "Unread", icon: Sparkles },
  { id: "MUSIC", label: "Musique & Mixes", labelEn: "Music & Mixes", icon: Disc3 },
  { id: "SOCIAL", label: "Social", labelEn: "Social", icon: Heart },
  { id: "EVENTS", label: "Événements & Système", labelEn: "Events & System", icon: Calendar },
];

function getNotifConfig(notif: Notification, tr: Translate) {
  if (notif.type === "NEW_MIX") {
    return {
      icon: Disc3,
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      typeLabel: tr("Nouveau Mix", "New Mix"),
      category: "MUSIC",
    };
  }
  if (notif.type === "NEW_TRACK") {
    return {
      icon: Headphones,
      badgeColor: "bg-pink-500/15 text-pink-400 border-pink-500/30",
      typeLabel: tr("Nouveau Titre", "New Track"),
      category: "MUSIC",
    };
  }
  if (notif.type === "NEW_FOLLOWER") {
    return {
      icon: UserPlus,
      badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      typeLabel: tr("Nouvel Abonné", "New Follower"),
      category: "SOCIAL",
    };
  }
  if (notif.type === "NEW_LIKE") {
    return {
      icon: Heart,
      badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      typeLabel: tr("Coup de Cœur", "New Like"),
      category: "SOCIAL",
    };
  }
  if (notif.type === "NEW_COMMENT") {
    return {
      icon: MessageCircle,
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      typeLabel: tr("Commentaire", "Comment"),
      category: "SOCIAL",
    };
  }
  if (notif.title.toLowerCase().includes("événement") || notif.title.toLowerCase().includes("event")) {
    return {
      icon: Calendar,
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      typeLabel: tr("Événement", "Event"),
      category: "EVENTS",
    };
  }
  return {
    icon: Bell,
    badgeColor: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    typeLabel: tr("Système", "System"),
    category: "EVENTS",
  };
}

function NotificationRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { tr, language } = useI18n();
  const [imgErr, setImgErr] = useState(false);
  const { icon: Icon, badgeColor, typeLabel } = getNotifConfig(notif, tr);

  const handleClick = () => {
    if (!notif.read) {
      onRead(notif.id);
    }
  };

  // Contenu commun, enveloppé dans un Link seulement si la notification a une cible
  const body = (
    <>
      {/* Avatar or Themed Icon */}
      <div className="relative flex-shrink-0">
        {notif.imageUrl && !imgErr ? (
          <div className="relative h-12 w-12 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-white/[0.08] shadow-md">
            <Image
              src={notif.imageUrl}
              alt=""
              fill
              className="object-cover group-hover/link:scale-105 transition-transform duration-300"
              sizes="48px"
              onError={() => setImgErr(true)}
            />
          </div>
        ) : (
          <div
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center border shadow-md",
              badgeColor
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}

        {/* Type Badge on Avatar */}
        {notif.imageUrl && !imgErr && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border ring-2 ring-[#0f1117]",
              badgeColor
            )}
          >
            <Icon className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Text Details */}
      <div className="flex-1 min-w-0 pt-0.5 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
              badgeColor
            )}
          >
            {typeLabel}
          </span>

          <span className="text-[11px] text-zinc-500 font-medium">
            {timeAgo(notif.createdAt, language)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-bold truncate leading-snug",
              notif.read
                ? "text-zinc-300 group-hover/link:text-white"
                : "text-white group-hover/link:text-purple-300"
            )}
          >
            {stripEmoji(notif.title)}
          </p>
          {notif.linkUrl && (
            <ExternalLink className="h-3 w-3 text-zinc-600 group-hover/link:text-purple-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
          )}
        </div>

        {notif.body && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {stripEmoji(notif.body)}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-200 border",
        notif.read
          ? "bg-[#0f1117]/60 border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.07]"
          : "bg-[#141520] border-purple-500/25 shadow-lg shadow-purple-950/20 hover:bg-[#171826] hover:border-purple-500/40"
      )}
    >
      {/* Visual Accent Bar for unread items */}
      {!notif.read && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-purple-500 via-pink-500 to-amber-500 shadow-sm shadow-purple-500" />
      )}

      {notif.linkUrl ? (
        <Link
          href={notif.linkUrl}
          onClick={handleClick}
          className="flex-1 min-w-0 flex items-start gap-4 group/link cursor-pointer"
        >
          {body}
        </Link>
      ) : (
        <div className="flex-1 min-w-0 flex items-start gap-4">{body}</div>
      )}

      {/* Row Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notif.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRead(notif.id);
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title={tr("Marquer comme lu", "Mark as read")}
              aria-label={tr("Marquer comme lu", "Mark as read")}
            >
              <Check className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notif.id);
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title={tr("Supprimer la notification", "Delete notification")}
            aria-label={tr("Supprimer", "Delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Small Dot indicator for unread */}
        {!notif.read && (
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 ring-2 ring-purple-500/30 flex-shrink-0 ml-1 shadow-sm" />
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsApi.list(1, false),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(tr(`${res.data.marked} notification(s) marquée(s) comme lue(s)`, `${res.data.marked} notification(s) marked as read`));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(tr("Notification supprimée", "Notification deleted"));
    },
  });

  const allNotifications = useMemo(() => data?.data ?? [], [data]);
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  // Filtered notifications by active tab
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      if (activeTab === "ALL") return true;
      if (activeTab === "UNREAD") return !n.read;
      const conf = getNotifConfig(n, tr);
      return conf.category === activeTab;
    });
  }, [allNotifications, activeTab, tr]);

  return (
    <RequireAuth>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-6 select-none">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                <Bell className="h-5 w-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {tr("Centre de Notifications", "Notification Center")}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              {unreadCount > 0 ? (
                <>
                  Vous avez{" "}
                  <span className="font-bold text-purple-400">
                    {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue{unreadCount > 1 ? "s" : ""}
                  </span>
                  .
                </>
              ) : (
                tr("Vous êtes parfaitement à jour dans vos alertes !", "You're all caught up!")
              )}
            </p>
          </div>

          {/* Quick Global Action */}
          {unreadCount > 0 && (
            <button
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-bold text-white transition-all shadow-sm hover:scale-105 active:scale-95 self-start sm:self-center"
            >
              <CheckCheck className="h-4 w-4 text-purple-400" />
              <span>{tr("Tout marquer comme lu", "Mark all as read")}</span>
            </button>
          )}
        </div>

        {/* ── Filter Tabs ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            let countBadge: number | null = null;
            if (tab.id === "UNREAD") countBadge = unreadCount;
            else if (tab.id === "ALL") countBadge = allNotifications.length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border",
                  active
                    ? "bg-purple-600 text-white border-purple-500/50 shadow-lg shadow-purple-900/30"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.06]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tr(tab.label, tab.labelEn)}</span>
                {countBadge !== null && countBadge > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      active ? "bg-white/20 text-white" : "bg-white/[0.06] text-zinc-300"
                    )}
                  >
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content List ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-2.5">
            {filteredNotifications.map((n) => (
              <NotificationRow
                key={n.id}
                notif={n}
                onRead={(id) => readMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-3 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              {activeTab === "UNREAD" ? (
                <Sparkles className="h-7 w-7" />
              ) : activeTab === "MUSIC" ? (
                <Disc3 className="h-7 w-7" />
              ) : activeTab === "SOCIAL" ? (
                <Heart className="h-7 w-7" />
              ) : (
                <Bell className="h-7 w-7" />
              )}
            </div>

            <h3 className="text-base font-bold text-white">
              {activeTab === "UNREAD"
                ? "Aucune notification non lue"
                : activeTab === "MUSIC"
                ? "Aucune alerte musicale pour l'instant"
                : activeTab === "SOCIAL"
                ? tr("Aucune activité sociale récente", "No recent social activity")
                : "Aucune notification"}
            </h3>

            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {activeTab === "UNREAD"
                ? tr("Toutes vos notifications ont été lues avec succès !", "All your notifications have been read!")
                : tr("Dès qu'un DJ que vous suivez publie un nouveau mix, morceau ou annonce une soirée, vous le retrouverez ici.", "As soon as a DJ you follow releases a new mix or track, or announces a night, you'll find it here.")}
            </p>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
