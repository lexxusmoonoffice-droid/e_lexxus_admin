"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, RefreshCw, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Topbar from "@/components/Topbar";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  apiError,
} from "@/lib/hooks";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [spinning, setSpinning] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useNotifications(
    filter === "unread" ? { status: "unread" } : {}
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const refresh = useCallback(async () => {
    setSpinning(true);
    await refetch();
    setLastRefreshed(new Date());
    setTimeout(() => setSpinning(false), 600);
  }, [refetch]);

  // Manual polling every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
      setLastRefreshed(new Date());
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [refetch]);

  async function onMarkRead(id: string) {
    try {
      await markRead.mutateAsync(id);
    } catch (err) {
      toast.error(apiError(err, "Failed to mark as read"));
    }
  }

  async function onMarkAll() {
    try {
      await markAll.mutateAsync();
      toast.success("All marked as read");
    } catch (err) {
      toast.error(apiError(err, "Failed"));
    }
  }

  return (
    <>
      <Topbar title="Notifications" />
      <div className="p-6 max-w-3xl">
        {/* Controls */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-black text-white" : "bg-white border border-neutral-200 hover:bg-neutral-50"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === "unread" ? "bg-black text-white" : "bg-white border border-neutral-200 hover:bg-neutral-50"}`}
            >
              Unread {unreadCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{unreadCount}</span>}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              Updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 5 min
            </span>
            <button
              onClick={refresh}
              className="btn-outline flex items-center gap-1.5 text-xs"
              title="Refresh now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAll}
                disabled={markAll.isPending}
                className="btn-outline flex items-center gap-1.5 text-xs disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-3 bg-neutral-100 rounded w-1/3 mb-2" />
                <div className="h-2.5 bg-neutral-100 rounded w-2/3" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="card p-16 text-center">
              <Bell className="w-10 h-10 mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">
                {filter === "unread" ? "No unread notifications." : "No notifications yet."}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`card p-4 flex items-start gap-4 transition ${!n.read ? "border-l-4 border-l-violet-500 bg-violet-50/30" : ""}`}
              >
                {/* Unread dot */}
                <div className="mt-1 shrink-0">
                  {!n.read ? (
                    <span className="w-2 h-2 rounded-full bg-violet-500 block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-neutral-200 block" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                    <span className="text-xs text-neutral-400 shrink-0">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.body}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-xs text-violet-600 underline flex items-center gap-1 hover:text-violet-800"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        disabled={markRead.isPending}
                        className="text-xs text-neutral-400 hover:text-black underline disabled:opacity-50"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
