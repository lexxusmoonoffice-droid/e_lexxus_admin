"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

/** Maps HTTP status (or undefined for network errors) to a human-friendly message. */
function loginErrorMessage(status: number | undefined, raw: string): string {
  switch (status) {
    case 400:
      return "Please check your email and password format.";
    case 401:
      return "Incorrect email or password.";
    case 403:
      // Could be "not admin" or "account suspended"
      if (raw.toLowerCase().includes("suspended")) return "This account has been suspended. Contact support.";
      if (raw.toLowerCase().includes("not an admin")) return "That account doesn't have admin access.";
      return raw || "Access denied.";
    case 429:
      return "Too many login attempts. Please wait 15 minutes before trying again.";
    case 500:
    case 502:
    case 503:
      return "The server encountered an error. Please try again in a moment.";
    default:
      if (!status) return "Unable to reach the server. Check your connection and try again.";
      return raw || "Login failed. Please try again.";
  }
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const errorParam = searchParams.get("error");
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "not-admin" ? "That account doesn't have admin access." : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      toast.success("Welcome back");
      router.push(nextPath);
    } catch (err) {
      const e = err as Error & { status?: number };
      const msg = loginErrorMessage(e.status, e.message);
      setError(msg);
      toast.error(msg, { duration: e.status === 429 ? 6000 : 3000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="flex gap-[3px] h-3 items-end">
            <span className="block w-4 h-[2px] bg-black" />
            <span className="block w-4 h-[2px] bg-black" />
            <span className="block w-4 h-[2px] bg-black" />
          </div>
          <span className="logo-wordmark mt-1 text-base">LEXXUS</span>
          <span className="text-[10px] text-neutral-500 tracking-widest mt-1">ADMIN</span>
        </div>
        <h1 className="text-xl font-semibold text-center">Sign in to Admin</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={`text-xs rounded-lg px-3 py-2 ${
              error.includes("Too many") ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-600 border border-rose-200"
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
