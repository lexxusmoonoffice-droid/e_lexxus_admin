"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import { confirm } from "@/components/ConfirmDialog";
import { useAdminProducts, useDeleteProduct, usePatchProductStatus, useBulkProductAction, apiError } from "@/lib/hooks";
import { fixImageUrl, apiGet } from "@/lib/api";

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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params: Record<string, unknown> = { page, limit };
  if (search) params.q = search;
  if (status !== "All") params.status = status;

  const { data, isLoading, isError } = useAdminProducts(params);
  const { data: allData } = useAdminProducts({ limit: 1 });
  const { data: publishedData } = useAdminProducts({ status: "published", limit: 1 });
  const { data: draftData } = useAdminProducts({ status: "draft", limit: 1 });
  const { data: reviewData } = useAdminProducts({ status: "review", limit: 1 });

  const del = useDeleteProduct();
  const patchStatus = usePatchProductStatus();
  const bulk = useBulkProductAction();
  const [publishing, setPublishing] = useState(false);

  const kpis = [
    {
      label: "All Products",
      value: allData?.total ?? 0,
      color: "border-l-blue-500",
      bg: "bg-blue-50/50",
      statusVal: "All",
    },
    {
      label: "Published",
      value: publishedData?.total ?? 0,
      color: "border-l-emerald-500",
      bg: "bg-emerald-50/50",
      statusVal: "published",
    },
    {
      label: "Drafts",
      value: draftData?.total ?? 0,
      color: "border-l-neutral-400",
      bg: "bg-neutral-50/50",
      statusVal: "draft",
    },
    {
      label: "Review",
      value: reviewData?.total ?? 0,
      color: "border-l-amber-500",
      bg: "bg-amber-50/50",
      statusVal: "review",
    },
  ];

  const products = data?.data || [];
  const allIds = products.map((p) => p.id);
  const isAllSelected = products.length > 0 && products.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleSelect = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [search, status, page, limit]);

  async function onBulkAction(action: "publish" | "unpublish" | "delete") {
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${selectedIds.length} products?`,
        message: "This will delete all selected products permanently.",
        confirmText: "Delete",
        variant: "danger",
      });
      if (!ok) return;
    }

    try {
      const res = await bulk.mutateAsync({ ids: selectedIds, action });
      toast.success(`${action === "unpublish" ? "Drafted" : action.charAt(0).toUpperCase() + action.slice(1) + "ed"} ${res.affected} products`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onPublishAllDrafts() {
    setPublishing(true);
    try {
      const res = await apiGet<{ data: { id: string; status: string }[] }>("/admin/products?status=draft&limit=1000");
      const ids = res.data.map((p) => p.id);
      if (!ids.length) { toast("No draft products found"); return; }
      const result = await bulk.mutateAsync({ ids, action: "publish" });
      toast.success(`Published ${result.affected} product${result.affected !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setPublishing(false);
    }
  }

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

  return (
    <>
      <Topbar title="Products" />
      <div className="p-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              onClick={() => {
                setStatus(kpi.statusVal);
                setPage(1);
              }}
              className={`p-3 border-l-4 ${kpi.color} ${kpi.bg} border border-y-neutral-200 border-r-neutral-200 hover:shadow-sm cursor-pointer transition select-none flex items-center justify-between rounded`}
            >
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                  {kpi.label}
                </div>
                <div className="text-lg font-bold text-neutral-800 mt-0.5">
                  {kpi.value}
                </div>
              </div>
              <div className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-600 bg-white border px-1.5 py-0.5 rounded shadow-sm">
                Filter
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <input
              placeholder="Search products…"
              className="input w-56"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="input w-36"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {FILTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPublishAllDrafts}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 transition"
            >
              {publishing ? "Publishing…" : "Publish all drafts"}
            </button>
            <Link href="/products/new" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Product
            </Link>
          </div>
        </div>

        <div className="text-xs text-neutral-400 mb-3">
          {isLoading ? "Loading…" : `${data?.total ?? 0} product${(data?.total ?? 0) !== 1 ? "s" : ""}`}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-neutral-900 text-white rounded-lg p-3 mb-4 text-xs animate-fade-in shadow-md select-none">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-neutral-300">
                {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-neutral-400 hover:text-white underline"
              >
                Deselect all
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onBulkAction("publish")}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1"
              >
                Publish Selected
              </button>
              <button
                onClick={() => onBulkAction("unpublish")}
                className="px-3 py-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-white font-bold transition flex items-center gap-1"
              >
                Draft Selected
              </button>
              <button
                onClick={() => onBulkAction("delete")}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="cursor-pointer rounded border-neutral-300 text-black focus:ring-black"
                  />
                </th>
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
                <tr><td colSpan={8} className="table-td text-center text-rose-600 py-8">Could not load products.</td></tr>
              )}
              {!isLoading && products.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-neutral-400 py-12">No products found</td></tr>
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
                    <td className="table-td w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={(e) => toggleSelect(e, p.id)}
                        className="cursor-pointer rounded border-neutral-300 text-black focus:ring-black"
                      />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {p.thumbnail && (
                          <img src={fixImageUrl(p.thumbnail) ?? ""} className="w-10 h-10 rounded object-cover shrink-0" alt={p.title} />
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

        {/* Pagination Bar */}
        {!isLoading && data && data.pages > 1 && (
          <div className="flex items-center justify-between mt-5 bg-white border border-neutral-200 rounded-lg px-4 py-3 text-sm select-none shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 text-xs">Items per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-neutral-300 rounded px-2 py-1 text-xs outline-none bg-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-neutral-500 text-xs">
                Page <strong>{page}</strong> of <strong>{data.pages}</strong>
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded border text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50 disabled:hover:bg-white transition"
                >
                  Previous
                </button>
                <button
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  className="px-3 py-1.5 rounded border text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50 disabled:hover:bg-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
