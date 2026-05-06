"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";
type ToastMsg = { id: number; type: ToastType; message: string };

let listeners: ((t: ToastMsg) => void)[] = [];
let counter = 0;

export function toast(message: string, type: ToastType = "success") {
  const t = { id: ++counter, type, message };
  listeners.forEach((fn) => fn(t));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const fn = (t: ToastMsg) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm pointer-events-auto animate-fade-in ${t.type === "success" ? "bg-neutral-900 text-white" : "bg-red-600 text-white"}`}>
          {t.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
