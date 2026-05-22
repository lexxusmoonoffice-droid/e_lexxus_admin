"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { confirm } from "@/components/ConfirmDialog";
import { useAdminProducts, useDeleteProduct, apiError } from "@/lib/hooks";

const STATUSES = ["All", "published", "draft", "review", "removed"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const params: Record<string, unknown> = { limit: 50 };
  if (search) params.q = search;
  if (status !== "All") params.status = status;

  const { data, isLoading, isError } = useAdminProducts(params);
  const del = useDeleteProduct();

  async function onDelete(id: string, name: string) {
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
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
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
                <th className="table-th">Brand</th>
                <th className="table-th">Category</th>
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
                const brand = typeof p.brand === "string" ? p.brand : p.brand?.name || "—";
                const category = typeof p.category === "string" ? p.category : p.category?.name || "—";
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 transition">
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
                    <td className="table-td">{brand}</td>
                    <td className="table-td">{category}</td>
                    <td className="table-td font-medium">
                      {p.price === 0 ? <span className="text-emerald-600">Free</span> : `₹${p.price.toLocaleString("en-IN")}`}
                    </td>
                    <td className="table-td text-neutral-400 text-xs">
                      {p.fileSizeMb ? `${p.fileSizeMb} Mb` : "—"}
                    </td>
                    <td className="table-td"><StatusPill value={p.status} /></td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <Link href={`/products/${p.id}`} className="p-1.5 hover:bg-neutral-100 rounded">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(p.id, p.title)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
