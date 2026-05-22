"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, HelpCircle, Info, X } from "lucide-react";

type Variant = "danger" | "warning" | "info";

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
};

type Pending = ConfirmOptions & {
  id: number;
  resolve: (ok: boolean) => void;
};

let listener: ((p: Pending) => void) | null = null;
let counter = 0;

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const p: Pending = { id: ++counter, ...opts, resolve };
    if (listener) listener(p);
    else resolve(false);
  });
}

const variantTheme: Record<Variant, { icon: typeof AlertTriangle; ring: string; btn: string; iconColor: string }> = {
  danger: {
    icon: AlertTriangle,
    ring: "bg-rose-100",
    iconColor: "text-rose-600",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    ring: "bg-amber-100",
    iconColor: "text-amber-600",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: Info,
    ring: "bg-sky-100",
    iconColor: "text-sky-600",
    btn: "bg-neutral-900 hover:bg-neutral-800 text-white",
  },
};

export default function ConfirmContainer() {
  const [current, setCurrent] = useState<Pending | null>(null);

  useEffect(() => {
    listener = (p) => setCurrent(p);
    return () => { listener = null; };
  }, []);

  const close = useCallback((ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setCurrent(null);
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [current, close]);

  if (!current) return null;

  const variant: Variant = current.variant || "info";
  const theme = variantTheme[variant];
  const Icon = variant === "info" ? HelpCircle : theme.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        <button
          onClick={() => close(false)}
          className="absolute top-3 right-3 p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-7 pb-2 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full ${theme.ring} flex items-center justify-center mb-4`}>
            <Icon className={`w-8 h-8 ${theme.iconColor}`} />
          </div>
          <h3 id="confirm-title" className="font-semibold text-lg text-neutral-900">
            {current.title}
          </h3>
          {current.message && (
            <p className="mt-2 text-sm text-neutral-600 whitespace-pre-line">
              {current.message}
            </p>
          )}
        </div>

        <div className="px-6 pt-4 pb-6 flex items-center justify-center gap-3">
          <button
            onClick={() => close(false)}
            className="px-5 py-2 rounded-lg text-sm font-medium border border-neutral-300 hover:bg-neutral-50 text-neutral-700 min-w-[96px]"
          >
            {current.cancelText || "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            autoFocus
            className={`px-5 py-2 rounded-lg text-sm font-medium min-w-[96px] ${theme.btn}`}
          >
            {current.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
