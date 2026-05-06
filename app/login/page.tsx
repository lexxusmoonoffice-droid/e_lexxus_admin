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
    errorParam === "not-admin" ? "That account is not an admin." : null,
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
      const msg = (err as Error).message || "Login failed";
      setError(msg);
      toast.error(msg);
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
          {error && <div className="text-xs text-rose-600">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
