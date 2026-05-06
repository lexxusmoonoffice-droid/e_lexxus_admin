"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";

/**
 * Wraps every admin page. If the user isn't logged in (or isn't an admin),
 * bounces to /login. Renders children only when auth is resolved + admin.
 * `/login` is the one public route.
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublic = pathname?.startsWith("/login");

  useEffect(() => {
    if (loading || isPublic) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
    } else if (user.role !== "admin") {
      router.replace("/login?error=not-admin");
    }
  }, [loading, user, pathname, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-neutral-400">
        Loading…
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-neutral-400">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}
