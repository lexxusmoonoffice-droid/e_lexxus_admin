"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Star, Eye, EyeOff, Trash2, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import { confirm } from "@/components/ConfirmDialog";
import {
  useAdminReviews,
  useSetReviewStatus,
  useDeleteAdminReview,
  apiError,
} from "@/lib/hooks";

export default function AdminReviewsPage() {
  const [params, setParams] = useState<{ status: string; rating: string; q: string; page: number }>({
    status: "",
    rating: "",
    q: "",
    page: 1,
  });
  const queryParams: Record<string, unknown> = { page: params.page, limit: 20 };
  if (params.status) queryParams.status = params.status;
  if (params.rating) queryParams.rating = params.rating;
  if (params.q) queryParams.q = params.q;

  const { data, isLoading } = useAdminReviews(queryParams);
  const setStatus = useSetReviewStatus();
  const del = useDeleteAdminReview();

  const rows = data?.data || [];

  async function toggle(id: string, next: "visible" | "hidden") {
    try {
      await setStatus.mutateAsync({ id, status: next });
      toast.success(next === "hidden" ? "Review hidden" : "Review restored");
    } catch (err) {
      toast.error(apiError(err, "Update failed"));
    }
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "Delete this review permanently?",
      message: "Prefer Hide for reversible moderation — deletion cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast.success("Review deleted");
    } catch (err) {
      toast.error(apiError(err, "Delete failed"));
    }
  }

  return (
    <>
      <Topbar title="Reviews" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              className="input pl-8 max-w-[260px]"
              placeholder="Search in comment…"
              value={params.q}
              onChange={(e) => setParams((p) => ({ ...p, q: e.target.value, page: 1 }))}
            />
          </div>
          <select
            className="input max-w-[140px]"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          >
            <option value="">All statuses</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select
            className="input max-w-[140px]"
            value={params.rating}
            onChange={(e) => setParams((p) => ({ ...p, rating: e.target.value, page: 1 }))}
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
            ))}
          </select>
          <span className="text-sm text-neutral-500 ml-auto">
            {isLoading ? "Loading…" : `${data?.total || 0} review${(data?.total || 0) !== 1 ? "s" : ""}`}
          </span>
        </div>

        {!isLoading && rows.length === 0 && (
          <div className="card p-10 text-center text-sm text-neutral-400">
            {params.status || params.rating || params.q ? "No reviews match your filters." : "No reviews yet."}
          </div>
        )}

        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="card p-5 flex gap-5 items-start">
              {r.product?.thumbnail ? (
                <img src={r.product.thumbnail} alt="" className="w-20 h-20 object-cover rounded" />
              ) : (
                <div className="w-20 h-20 bg-neutral-100 rounded" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    {r.product ? (
                      <Link href={`/products/${r.product.id}`} className="font-semibold hover:underline">
                        {r.product.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-neutral-400">Deleted product</span>
                    )}
                    <div className="text-xs text-neutral-500 mt-0.5">
                      by <span className="font-medium">{r.user?.name || "Unknown"}</span>
                      {r.user?.email && <span className="text-neutral-400"> · {r.user.email}</span>}
                      <span className="mx-1">·</span>
                      {new Date(r.createdAt).toLocaleString()}
                      {r.verifiedPurchase && (
                        <span className="ml-2 text-[10px] tracking-widest uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                          verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded ${
                        r.status === "visible" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.status === "visible" ? (
                      <button
                        onClick={() => toggle(r.id, "hidden")}
                        disabled={setStatus.isPending}
                        className="text-xs underline inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <EyeOff className="w-3 h-3" /> Hide
                      </button>
                    ) : (
                      <button
                        onClick={() => toggle(r.id, "visible")}
                        disabled={setStatus.isPending}
                        className="text-xs underline inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" /> Show
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(r.id)}
                      disabled={del.isPending}
                      className="text-xs text-rose-600 underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "text-amber-400 fill-amber-400" : "text-neutral-300"}`} />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-neutral-700 mt-3 leading-relaxed">{r.comment}</p>}
              </div>
            </li>
          ))}
        </ul>

        {!isLoading && (data?.pages || 0) > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-neutral-500">Page {data!.page} of {data!.pages}</span>
            <div className="flex gap-2">
              <button
                disabled={params.page <= 1}
                onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
                className="btn-outline disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={data!.page >= data!.pages}
                onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
                className="btn-outline disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
