"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, RotateCcw, CheckCircle2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import {
  useAdminOrder,
  useRefundOrder,
  useResendReceipt,
  useUpdateOrderStatus,
  apiError,
} from "@/lib/hooks";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useAdminOrder(params?.id as string);
  const refundM = useRefundOrder();
  const receiptM = useResendReceipt();
  const statusM = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="p-6 text-sm text-neutral-500">Loading order…</div>
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <Topbar title="Not found" />
        <div className="p-6 text-sm text-rose-600">Order not found.</div>
      </>
    );
  }
  const o = data.order;
  const buyer = typeof o.buyer === "string" ? null : o.buyer;

  async function markComplete() {
    if (!confirm("Mark this order as paid?")) return;
    try {
      await statusM.mutateAsync({ id: o.id, status: "paid" });
      toast.success("Marked paid");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function refund() {
    const reason = prompt("Refund reason (optional)?") || undefined;
    if (!confirm("Refund this order? This revokes the download token.")) return;
    try {
      await refundM.mutateAsync({ id: o.id, reason });
      toast.success("Refunded");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function resendReceipt() {
    try {
      await receiptM.mutateAsync(o.id);
      toast.success("Receipt emailed");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <Topbar title={`Order ${String(o.id).slice(-8).toUpperCase()}`} />
      <div className="p-6 space-y-6 max-w-[1100px]">
        <Link href="/orders" className="text-sm text-neutral-500 underline flex items-center gap-1 w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
        </Link>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Order details</h2>
              <StatusPill value={o.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Meta label="Date" value={new Date(o.createdAt).toLocaleString()} />
              <Meta label="Items" value={o.items.length.toString()} />
              <Meta label="Payment" value={o.payment?.method || "—"} />
              <Meta label="Zoho payment ID" value={o.payment?.zohoPaymentId || "—"} />
              <Meta label="Customer" value={buyer?.name || o.billing?.name || "—"} />
              <Meta label="Email" value={buyer?.email || o.billing?.email || "—"} />
              <Meta label="Country" value={o.billing?.country || "—"} />
              {o.downloadToken && <Meta label="Downloads" value={`${o.downloadCount || 0} / ${o.downloadLimit ?? "—"}`} />}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-2">
                {o.items.map((it, i) => {
                  const title = it.title || it.product?.title || it.bundle?.name || "Item";
                  const img = it.product?.thumbnail || it.bundle?.image;
                  return (
                    <div key={i} className="flex items-center gap-4 border border-neutral-100 p-3">
                      {img && <img src={img} className="w-14 h-14 rounded object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{title}</div>
                        <div className="text-xs text-neutral-500 capitalize">{it.type}</div>
                      </div>
                      <div className="text-sm">
                        {it.qty} × ₹{it.priceAtPurchase.toLocaleString("en-IN")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 flex justify-end">
              <div className="text-right text-sm space-y-1">
                <div><span className="text-neutral-500">Subtotal</span> · ₹{o.subtotal.toLocaleString("en-IN")}</div>
                {typeof o.tax === "number" && o.tax > 0 && (
                  <div><span className="text-neutral-500">Tax</span> · ₹{o.tax.toLocaleString("en-IN")}</div>
                )}
                <div className="font-semibold text-base">Total · ₹{o.total.toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold">Actions</h3>
              {o.status === "pending" && (
                <button onClick={markComplete} disabled={statusM.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Mark as paid
                </button>
              )}
              <button onClick={resendReceipt} disabled={receiptM.isPending} className="btn-outline w-full flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> Send receipt
              </button>
              {o.status === "paid" && (
                <button
                  onClick={refund}
                  disabled={refundM.isPending}
                  className="w-full border border-rose-300 text-rose-600 hover:bg-rose-50 py-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Refund order
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className="font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}
