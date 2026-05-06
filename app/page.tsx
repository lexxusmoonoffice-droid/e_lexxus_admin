"use client";

import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { DollarSign, ShoppingBag, Users, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import {
  useDashboardStats,
  useRecentOrders,
  useRevenueChart,
  useTopCategories,
} from "@/lib/hooks";

function fmtMoney(n: number) {
  return `₹${(n || 0).toLocaleString("en-IN")}`;
}

function Delta({ pct }: { pct?: number }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-600"}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const stats = useDashboardStats();
  const chart = useRevenueChart();
  const cats = useTopCategories();
  const recent = useRecentOrders(5);

  // Backend returns `{data:[{year,month,label,total,count}]}`. Flatten to monthly totals.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRows = (chart.data as any)?.data as Array<{ month: number; label: string; total: number }> | undefined;
  const months = chartRows?.map((r) => r.total) || [];
  const monthLabels = chartRows?.map((r) => r.label) || [];
  const chartYear = chartRows?.[chartRows.length - 1]?.month
    ? new Date().getFullYear()
    : new Date().getFullYear();
  const maxRevenue = Math.max(1, ...months);

  // Both `{value,deltaPct}` and `{total,deltaPct}` shapes are handled so a
  // backend upgrade doesn't break this view.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function v(s: any): number {
    return typeof s?.value === "number" ? s.value : typeof s?.total === "number" ? s.total : 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function p(s: any): number | undefined {
    return typeof s?.deltaPct === "number" ? s.deltaPct : undefined;
  }

  const cards = stats.data
    ? [
        { icon: DollarSign, label: "Total Revenue", value: fmtMoney(v(stats.data.revenue)), pct: p(stats.data.revenue) },
        { icon: ShoppingBag, label: "Orders", value: v(stats.data.orders).toLocaleString(), pct: p(stats.data.orders) },
        { icon: Users, label: "Customers", value: v(stats.data.customers).toLocaleString(), pct: p(stats.data.customers) },
        { icon: Package, label: "Products", value: v(stats.data.products).toLocaleString(), pct: p(stats.data.products) },
      ]
    : [];

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.isLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-32 animate-pulse bg-neutral-100" />
          ))}
          {cards.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <s.icon className="w-5 h-5" />
                </div>
                <Delta pct={s.pct} />
              </div>
              <div className="text-2xl font-semibold mt-4">{s.value}</div>
              <div className="text-xs text-neutral-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <div className="card p-5">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">Revenue overview</div>
                <div className="text-xs text-neutral-500 mt-1">
                  {chartYear} · last 12 months
                </div>
              </div>
            </div>
            {chart.isLoading ? (
              <div className="h-52 animate-pulse bg-neutral-100 rounded" />
            ) : (
              <div className="h-52 flex items-end gap-2">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-black rounded-t"
                      style={{ height: `${(m / maxRevenue) * 100}%` }}
                      title={fmtMoney(m)}
                    />
                    <div className="text-[10px] text-neutral-400">
                      {monthLabels[i]?.slice(0, 1) || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold mb-3">Top categories</div>
            {cats.isLoading ? (
              <div className="h-40 animate-pulse bg-neutral-100 rounded" />
            ) : (
              <div className="space-y-3">
                {(cats.data?.data || []).slice(0, 4).map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{c.name}</span>
                      <span className="text-neutral-500">{c.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${Math.min(100, c.pct)}%` }} />
                    </div>
                  </div>
                ))}
                {(!cats.data || cats.data.data.length === 0) && (
                  <div className="text-xs text-neutral-400">No data yet.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent orders</div>
            <Link href="/orders" className="text-xs underline">View all →</Link>
          </div>
          {recent.isLoading ? (
            <div className="h-24 animate-pulse bg-neutral-100 rounded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-500 text-xs">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">Order</th>
                    <th className="text-left py-2 px-2 font-medium">Buyer</th>
                    <th className="text-left py-2 px-2 font-medium">Items</th>
                    <th className="text-left py-2 px-2 font-medium">Total</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent.data?.data || []).map((o) => {
                    const buyer = typeof o.buyer === "string" ? null : o.buyer;
                    return (
                      <tr key={o.id} className="border-t border-neutral-100">
                        <td className="py-2 px-2">
                          <Link href={`/orders/${o.id}`} className="underline">
                            {String(o.id).slice(-8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-2 px-2">
                          {buyer?.name || o.billing?.name || "—"}
                        </td>
                        <td className="py-2 px-2">{o.items.length}</td>
                        <td className="py-2 px-2">{fmtMoney(o.total)}</td>
                        <td className="py-2 px-2">
                          <StatusPill value={o.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {(!recent.data || recent.data.data.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-neutral-400">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
