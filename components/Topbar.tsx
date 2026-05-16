"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function Topbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const initials = (user?.name || "AD")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function fetchUnread() {
    try {
      const res = await apiGet<{ data: { read: boolean }[]; total: number }>(
        "/notifications",
        { status: "unread", limit: 1 }
      );
      setUnread(res.total ?? 0);
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchUnread();
    const timer = setInterval(fetchUnread, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {actions && <div className="hidden sm:flex">{actions}</div>}
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-neutral-100 rounded-full px-4 py-2 w-72">
          <Search className="w-4 h-4 text-neutral-500" />
          <input placeholder="Search..." className="bg-transparent outline-none text-sm ml-3 flex-1" />
        </div>

        {/* Bell → notifications page */}
        <Link href="/notifications" className="relative p-1.5 hover:bg-neutral-100 rounded-full transition">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>

        {/* Avatar → profile page */}
        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition"
          title="My profile"
        >
          {initials}
        </Link>
      </div>
    </div>
  );
}
