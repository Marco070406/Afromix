"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Users, Flag, Calendar, CheckCircle, XCircle, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/app/(frontend)/components/auth/require-auth";
import { adminApi } from "@/app/(frontend)/lib/api/admin";
import { eventsApi } from "@/app/(frontend)/lib/api/events";
import { EventDetailModal } from "@/app/(frontend)/components/events/event-detail-modal";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Skeleton } from "@/app/(frontend)/components/ui/skeleton";
import { EmptyState } from "@/app/(frontend)/components/ui/empty-state";
import { timeAgo, cn } from "@/app/(frontend)/lib/utils";
import type { EventItem } from "@/types/api";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";

type AdminTab = "reports" | "users" | "events";

export default function AdminPage() {
  const { tr, language } = useI18n();
  const [tab, setTab] = useState<AdminTab>("reports");
  const [reportStatus, setReportStatus] = useState("PENDING");
  const queryClient = useQueryClient();

  // Reports
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports", reportStatus],
    queryFn: () => adminApi.listReports({ status: reportStatus, page: 1 }),
    enabled: tab === "reports",
  });

  const processReportMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "REVIEWED" | "DISMISSED" | "ACTION_TAKEN"; note?: string }) =>
      adminApi.processReport(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success(tr("Signalement traité", "Report handled"));
    },
    onError: () => toast.error(tr("Impossible de traiter le signalement", "Could not handle the report")),
  });

  // Users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.listUsers({ page: 1 }),
    enabled: tab === "users",
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      suspend ? adminApi.suspendUser(id, "Violation des règles") : adminApi.unsuspendUser(id),
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(suspend ? tr("Utilisateur suspendu", "User suspended") : tr("Utilisateur réactivé", "User reactivated"));
    },
  });

  const reports = reportsData?.data ?? [];
  const users = usersData?.data ?? [];

  const [eventStatus, setEventStatus] = useState("PENDING");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin-events", eventStatus],
    queryFn: () => eventsApi.list({ status: eventStatus }),
    enabled: tab === "events",
  });

  const events = eventsData?.data ?? [];

  return (
    <RequireAuth role="ADMIN">
      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Administration</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] mb-6">
          {[
            { id: "reports" as AdminTab, label: "Signalements", icon: Flag },
            { id: "users" as AdminTab, label: "Utilisateurs", icon: Users },
            { id: "events" as AdminTab, label: tr("Événements", "Events"), icon: Calendar },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === id ? "text-white border-b-2 border-red-500" : "text-zinc-500 hover:text-zinc-300")}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* Reports tab */}
        {tab === "reports" && (
          <div>
            {/* Status filter */}
            <div className="flex gap-1 mb-4">
              {["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN"].map((s) => (
                <button key={s} onClick={() => setReportStatus(s)}
                  className={cn("px-3 py-1.5 text-xs rounded-lg transition-all", reportStatus === s ? "bg-white/[0.10] text-white" : "text-zinc-500 hover:text-white")}>
                  {s === "PENDING" ? tr("En attente", "Pending") : s === "REVIEWED" ? tr("Examinés", "Reviewed") : s === "DISMISSED" ? tr("Rejetés", "Dismissed") : tr("Action prise", "Action taken")}
                </button>
              ))}
            </div>

            {reportsLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{report.targetType}</span>
                          <span className="text-xs text-zinc-500">{report.reason}</span>
                          <span className="text-xs text-zinc-600">{timeAgo(report.createdAt, language)}</span>
                        </div>
                        <p className="text-sm text-zinc-300">
                          {tr("Par", "By")} <span className="text-white">{report.reporter.profile?.displayName ?? report.reporter.email}</span>
                          {report.details && <span className="text-zinc-500"> — {report.details}</span>}
                        </p>
                        {report.moderatorNote && (
                          <p className="text-xs text-zinc-500 mt-1">Note: {report.moderatorNote}</p>
                        )}
                      </div>
                      {report.status === "PENDING" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="danger"
                            onClick={() => processReportMutation.mutate({ id: report.id, status: "ACTION_TAKEN", note: tr("Contenu supprimé", "Content removed") })}>
                            <XCircle className="h-3.5 w-3.5" /> Action
                          </Button>
                          <Button size="sm" variant="secondary"
                            onClick={() => processReportMutation.mutate({ id: report.id, status: "DISMISSED" })}>
                            <CheckCircle className="h-3.5 w-3.5" /> Ignorer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Flag} title={tr("Aucun signalement", "No reports")} description={`Aucun signalement avec le statut "${reportStatus}"`} />
            )}
          </div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <div>
            {usersLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : users.length > 0 ? (
              <div className="space-y-1">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {(user.profile?.displayName ?? user.email)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.profile?.displayName ?? "—"}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", user.role === "ADMIN" ? "bg-red-500/10 text-red-400" : user.role === "ARTIST" ? "bg-purple-500/10 text-purple-400" : "bg-white/[0.06] text-zinc-400")}>
                        {user.role}
                      </span>
                      {user.suspended ? (
                        <span className="text-xs text-red-400">{tr("Suspendu", "Suspended")}</span>
                      ) : null}
                      <Button size="sm" variant={user.suspended ? "secondary" : "danger"} isLoading={suspendMutation.isPending}
                        onClick={() => suspendMutation.mutate({ id: user.id, suspend: !user.suspended })}>
                        {user.suspended ? <><RotateCcw className="h-3.5 w-3.5" /> {tr("Réactiver", "Reactivate")}</> : <><Ban className="h-3.5 w-3.5" /> {tr("Suspendre", "Suspend")}</>}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title={tr("Aucun utilisateur", "No users")} />
            )}
          </div>
        )}

        {/* Events tab */}
        {tab === "events" && (
          <div>
            {/* Status filter */}
            <div className="flex gap-1 mb-4">
              {[
                { id: "PENDING", label: tr("En attente de validation", "Awaiting approval") },
                { id: "APPROVED", label: tr("Validés", "Approved") },
                { id: "REJECTED", label: tr("Rejetés", "Dismissed") },
                { id: "ALL", label: tr("Tous", "All") },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setEventStatus(id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg transition-all",
                    eventStatus === id ? "bg-white/[0.10] text-white" : "text-zinc-500 hover:text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {eventsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                        {evt.coverUrl ? (
                          <Image src={evt.coverUrl} alt={evt.title} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-purple-900/40 text-purple-400">
                            <Calendar className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{evt.title}</h4>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                              evt.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : evt.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            )}
                          >
                            {evt.status === "PENDING"
                              ? tr("En attente", "Pending")
                              : evt.status === "APPROVED"
                              ? tr("Validé", "Approved")
                              : tr("Refusé", "Rejected")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {evt.artist ? `DJ: ${evt.artist.stageName}` : evt.createdBy?.email ? `Créateur: ${evt.createdBy.email}` : "AfroMix Event"}
                          {evt.city ? ` • ${evt.city}` : ""}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {tr("Prévu le", "Scheduled for")} {new Date(evt.startAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedEvent(evt);
                          setIsDetailOpen(true);
                        }}
                      >
                        {tr("Examiner & Modérer", "Review & moderate")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title={tr("Aucun événement trouvé", "No events found")}
                description={`Aucun événement avec le statut "${eventStatus}"`}
              />
            )}
          </div>
        )}

        {/* Event Detail & Moderation Modal */}
        <EventDetailModal
          event={selectedEvent}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedEvent(null);
          }}
        />
      </div>
    </RequireAuth>
  );
}
