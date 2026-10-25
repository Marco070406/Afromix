"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  CheckCheck,
  Disc3,
  Headphones,
  UserPlus,
  Heart,
  MessageCircle,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi, type Notification } from "@/app/(frontend)/lib/api/notifications";
import { timeAgo, cn, stripEmoji } from "@/app/(frontend)/lib/utils";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

function getNotifConfig(notif: Notification) {
  if (notif.type === "NEW_MIX") {
    return {
      icon: Disc3,
      badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      accentDot: "bg-purple-400",
    };
  }
  if (notif.type === "NEW_TRACK") {
    return {
      icon: Headphones,
      badgeColor: "bg-pink-500/15 text-pink-400 border-pink-500/30",
      accentDot: "bg-pink-400",
    };
  }
  if (notif.type === "NEW_FOLLOWER") {
    return {
      icon: UserPlus,
      badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      accentDot: "bg-blue-400",
    };
  }
  if (notif.type === "NEW_LIKE") {
    return {
      icon: Heart,
      badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      accentDot: "bg-rose-400",
    };
  }
  if (notif.type === "NEW_COMMENT") {
    return {
      icon: MessageCircle,
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      accentDot: "bg-emerald-400",
    };
  }
  if (notif.title.toLowerCase().includes("événement") || notif.title.toLowerCase().includes("event")) {
    return {
      icon: Calendar,
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      accentDot: "bg-amber-400",
    };
  }
  return {
    icon: Bell,
    badgeColor: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    accentDot: "bg-zinc-400",
  };
}

export function NotificationBellPopover() {
  const { tr, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Unread Count
  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const unreadCount = unreadData?.data?.count ?? 0;

  // List of latest 6 notifications for the preview dropdown
  const { data: listData, isLoading } = useQuery({
    queryKey: ["notifications", "preview-list"],
    queryFn: () => notificationsApi.list(1, false),
    enabled: open,
    staleTime: 10_000,
  });

  const notifications = (listData?.data ?? []).slice(0, 6);

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(tr(`${res.data.marked} notification(s) marquée(s) comme lue(s)`, `${res.data.marked} notification(s) marked as read`));
    },
  });

  // Mark single as read mutation
  const markSingleMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleItemClick = (notif: Notification) => {
    if (!notif.read) {
      markSingleMutation.mutate(notif.id);
    }
    setOpen(false);
    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    } else {
      router.push("/notifications");
    }
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "relative h-9 w-9 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
            open
              ? "bg-white/[0.1] text-white"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          )}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />

          {/* Unread Pill or Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-[10px] font-black text-white shadow-md shadow-purple-900/50 ring-2 ring-[#08090D] animate-scale-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[350px] sm:w-[380px] rounded-2xl bg-[#111319]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-0 overflow-hidden animate-slide-down select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-purple-300 transition-colors p-1"
                title={tr("Tout marquer comme lu", "Mark all as read")}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{tr("Tout lire", "Read all")}</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.03] no-scrollbar">
            {isLoading ? (
              <div className="p-3 space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
                      <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notif) => {
                const { icon: Icon, badgeColor, accentDot } = getNotifConfig(notif);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "group flex items-start gap-3 p-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer relative",
                      !notif.read && "bg-white/[0.02]"
                    )}
                  >
                    {/* Visual Icon / Avatar */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {notif.imageUrl ? (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-zinc-800 ring-1 ring-white/10">
                          <Image
                            src={notif.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center border",
                            badgeColor
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      )}

                      {/* Small badge overlay if avatar */}
                      {notif.imageUrl && (
                        <span
                          className={cn(
                            "absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center border ring-2 ring-[#111319]",
                            badgeColor
                          )}
                        >
                          <Icon className="h-2 w-2" />
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold leading-snug line-clamp-2",
                          notif.read ? "text-zinc-300" : "text-white"
                        )}
                      >
                        {stripEmoji(notif.title)}
                      </p>
                      {notif.body && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {stripEmoji(notif.body)}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                        {timeAgo(notif.createdAt, language)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notif.read && (
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full ring-2 ring-purple-500/20 flex-shrink-0 mt-1.5",
                          accentDot
                        )}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white">{tr("Vous êtes à jour !", "You're all caught up!")}</p>
                <p className="text-[11px] text-zinc-500 max-w-[220px] mx-auto">
                  {tr("Aucune nouvelle notification pour le moment.", "No new notifications for now.")}
                </p>
              </div>
            )}
          </div>

          {/* Footer Link to /notifications */}
          <div className="p-2 border-t border-white/[0.06] bg-white/[0.01]">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <span>{tr("Toutes les notifications", "All notifications")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
