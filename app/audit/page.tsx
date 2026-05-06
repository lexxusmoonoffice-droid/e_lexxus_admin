"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { useAuditLog } from "@/lib/hooks";
import type { ApiUser } from "@/lib/types";

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const { data, isLoading } = useAuditLog({
    page,
    limit: 30,
    ...(entity ? { entity } : {}),
  });

  const rows = data?.data || [];

  return (
    <>
      <Topbar title="Audit log" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <select
            className="input w-48"
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          >
            <option value="">All entities</option>
            <option>Product</option>
            <option>Bundle</option>
            <option>Category</option>
            <option>Brand</option>
            <option>BlogPost</option>
            <option>HeroSlide</option>
            <option>Order</option>
            <option>User</option>
          </select>
        </div>
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">When</th>
                <th className="table-th">Actor</th>
                <th className="table-th">Action</th>
                <th className="table-th">Entity</th>
                <th className="table-th">IP</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={5} className="table-td text-center text-neutral-400 py-12">No log entries.</td></tr>
              )}
              {rows.map((r) => {
                const actor = typeof r.actor === "string" ? null : (r.actor as ApiUser | undefined);
                return (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="table-td text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="table-td text-sm">{actor?.email || actor?.name || "—"}</td>
                    <td className="table-td text-xs font-mono">{r.action}</td>
                    <td className="table-td text-xs">
                      {r.entity}{r.entityId ? <span className="text-neutral-400"> · {r.entityId.slice(-8)}</span> : null}
                    </td>
                    <td className="table-td text-xs text-neutral-500">{r.ip || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-outline disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-xs text-neutral-500">Page {data.page} / {data.pages}</div>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-outline disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
