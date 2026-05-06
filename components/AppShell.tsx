"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";

/**
 * Renders the sidebar + main column for every admin route except /login
 * which needs full-viewport styling.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const isLogin = pathname.startsWith("/login");

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">{children}</div>
    </div>
  );
}
