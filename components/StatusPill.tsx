const MAP: Record<string, string> = {
  // Order
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-700",
  refunded: "bg-sky-50 text-sky-700",
  cancelled: "bg-neutral-100 text-neutral-600",
  // Legacy capitalized (kept for any un-migrated callers)
  Completed: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Refunded: "bg-red-50 text-red-700",
  // Content
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-neutral-100 text-neutral-700",
  removed: "bg-rose-50 text-rose-700",
  review: "bg-amber-50 text-amber-700",
  Published: "bg-emerald-50 text-emerald-700",
  Draft: "bg-neutral-100 text-neutral-700",
  Free: "bg-blue-50 text-blue-700",
  // User
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-red-50 text-red-700",
  Active: "bg-emerald-50 text-emerald-700",
  Suspended: "bg-red-50 text-red-700",
};

/**
 * Accepts legacy `s` prop and new `value` prop for convenience.
 */
export default function StatusPill({ s, value }: { s?: string; value?: string }) {
  const v = (s ?? value ?? "").toString();
  return (
    <span className={`text-xs rounded-full px-2.5 py-0.5 capitalize ${MAP[v] || "bg-neutral-100"}`}>
      {v}
    </span>
  );
}
