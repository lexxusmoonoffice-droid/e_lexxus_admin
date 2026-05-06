"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { useAdminBundles, useDeleteBundle, apiError } from "@/lib/hooks";

export default function BundlesPage() {
  const { data, isLoading } = useAdminBundles({ limit: 100 });
  const del = useDeleteBundle();

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete bundle "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const bundles = data?.data || [];

  return (
    <>
      <Topbar title="Bundles" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${bundles.length} bundles · ${bundles.filter((b) => b.status === "published").length} published`}
          </p>
          <Link href="/bundles/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Bundle
          </Link>
        </div>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">Bundle</th>
                <th className="table-th">Tag</th>
                <th className="table-th">Models</th>
                <th className="table-th">Price</th>
                <th className="table-th">Savings</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && bundles.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-neutral-400 py-12">No bundles yet</td></tr>
              )}
              {bundles.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      {b.image && <img src={b.image} className="w-10 h-10 rounded object-cover shrink-0" alt={b.name} />}
                      <div>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-neutral-400">/{b.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs">
                    {b.tag && <span className="bg-neutral-100 px-2 py-0.5 rounded-full">{b.tag}</span>}
                    {b.badge && <span className="ml-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{b.badge}</span>}
                  </td>
                  <td className="table-td text-sm">
                    <span className="flex items-center gap-1 text-neutral-700">
                      <Package className="w-3 h-3" /> {b.modelCount}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="text-xs text-neutral-400 line-through">₹{b.originalPrice.toLocaleString("en-IN")}</span>{" "}
                    <span className="font-semibold">₹{b.bundlePrice.toLocaleString("en-IN")}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{b.savingsPct}%</span>
                  </td>
                  <td className="table-td"><StatusPill value={b.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <Link href={`/bundles/${b.id}`} className="p-1.5 hover:bg-neutral-100 rounded"><Edit className="w-4 h-4" /></Link>
                      <button onClick={() => onDelete(b.id, b.name)} className="p-1.5 hover:bg-red-50 text-red-500 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
