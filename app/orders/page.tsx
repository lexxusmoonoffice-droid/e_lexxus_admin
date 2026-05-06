"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { useAdminOrders } from "@/lib/hooks";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const params: Record<string, unknown> = { limit: 100 };
  if (search) params.q = search;
  if (status !== "All") params.status = status;

  const { data, isLoading } = useAdminOrders(params);
  const orders = data?.data || [];

  return (
    <>
      <Topbar title="Orders" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <input
            placeholder="Search by order ID or customer…"
            className="input w-80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>pending</option>
            <option>paid</option>
            <option>failed</option>
            <option>refunded</option>
            <option>cancelled</option>
          </select>
        </div>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">Order</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Date</th>
                <th className="table-th">Items</th>
                <th className="table-th">Total</th>
                <th className="table-th">Payment</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && orders.length === 0 && (
                <tr><td colSpan={8} className="table-td text-center text-neutral-400 py-12">No orders yet</td></tr>
              )}
              {orders.map((o) => {
                const buyer = typeof o.buyer === "string" ? null : o.buyer;
                return (
                  <tr key={o.id} className="hover:bg-neutral-50">
                    <td className="table-td font-medium">{String(o.id).slice(-8).toUpperCase()}</td>
                    <td className="table-td text-sm">
                      {buyer?.name || o.billing?.name || "—"}
                      <div className="text-xs text-neutral-400">{buyer?.email || o.billing?.email}</div>
                    </td>
                    <td className="table-td text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="table-td text-sm">{o.items.length}</td>
                    <td className="table-td font-medium">₹{o.total.toLocaleString("en-IN")}</td>
                    <td className="table-td text-xs">{o.payment?.method || "—"}</td>
                    <td className="table-td"><StatusPill value={o.status} /></td>
                    <td className="table-td">
                      <Link href={`/orders/${o.id}`} className="p-1.5 hover:bg-neutral-100 rounded inline-block">
                        <Eye className="w-4 h-4" />
                      </Link>
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
