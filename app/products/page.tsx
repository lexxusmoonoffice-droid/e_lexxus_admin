"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import { confirm } from "@/components/ConfirmDialog";
import { useAdminProducts, useDeleteProduct, usePatchProductStatus, apiError } from "@/lib/hooks";

const FILTER_STATUSES = ["All", "published", "draft", "review", "removed"];
const STATUS_OPTIONS = ["published", "draft", "review", "removed"];

const STATUS_STYLES: Record<string, string> = {
  published: "text-emerald-700 bg-emerald-50 border-emerald-200",
  draft: "text-neutral-600 bg-neutral-100 border-neutral-200",
  review: "text-amber-700 bg-amber-50 border-amber-200",
  removed: "text-rose-700 bg-rose-50 border-rose-200",
};

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const params: Record<string, unknown> = { limit: 50 };
  if (search) params.q = search;
  if (status !== "All") params.status = status;

  const { data, isLoading, isError } = useAdminProducts(params);
  const del = useDeleteProduct();
  const patchStatus = usePatchProductStatus();

  async function onDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message: "The product will be removed permanently.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>, id: string) {
    e.stopPropagation();
    try {
      await patchStatus.mutateAsync({ id, status: e.target.value });
      toast.success("Status updated");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const products = data?.data || [];

  return (
    <>
      <Topbar title="Products" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="Search products…"
              className="input w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="input w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {FILTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Link href="/products/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>

        <div className="text-xs text-neutral-400 mb-3">
          {isLoading ? "Loading…" : `${data?.total ?? 0} product${(data?.total ?? 0) !== 1 ? "s" : ""}`}
        </div>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">Product</th>
                <th className="table-th">Category</th>
                <th className="table-th">Subcategory</th>
                <th className="table-th">Price</th>
                <th className="table-th">File</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isError && (
                <tr><td colSpan={7} className="table-td text-center text-rose-600 py-8">Could not load products.</td></tr>
              )}
              {!isLoading && products.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-neutral-400 py-12">No products found</td></tr>
              )}
              {products.map((p) => {
                const category = typeof p.category === "string" ? p.category : p.category?.name || "—";
                const subCategory = typeof p.subCategory === "string" ? p.subCategory : (p.subCategory as { name?: string } | null)?.name || "—";
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="hover:bg-neutral-50 transition cursor-pointer"
                  >
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {p.thumbnail && (
                          <img src={p.thumbnail} className="w-10 h-10 rounded object-cover shrink-0" alt={p.title} />
                        )}
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-neutral-400">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{category}</td>
                    <td className="table-td">{subCategory}</td>
                    <td className="table-td font-medium">
                      {p.price === 0 ? <span className="text-emerald-600">Free</span> : `₹${p.price.toLocaleString("en-IN")}`}
                    </td>
                    <td className="table-td text-neutral-400 text-xs">
                      {p.fileSizeMb ? `${p.fileSizeMb} Mb` : "—"}
                    </td>
                    <td className="table-td" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.status}
                        onChange={(e) => onStatusChange(e, p.id)}
                        className={`text-xs font-medium px-2 py-1 rounded border outline-none cursor-pointer ${STATUS_STYLES[p.status] ?? STATUS_STYLES.draft}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => onDelete(e, p.id, p.title)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
