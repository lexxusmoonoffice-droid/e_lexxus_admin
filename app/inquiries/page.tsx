"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Mail, Trash2, Search, X, Check, Eye } from "lucide-react";
import Topbar from "@/components/Topbar";
import { confirm } from "@/components/ConfirmDialog";
import {
  useAdminInquiries,
  usePatchInquiryStatus,
  useDeleteInquiry,
  apiError,
  ApiInquiry,
} from "@/lib/hooks";

export default function AdminInquiriesPage() {
  const [params, setParams] = useState<{ status: string; q: string; page: number }>({
    status: "",
    q: "",
    page: 1,
  });
  const [selectedInquiry, setSelectedInquiry] = useState<ApiInquiry | null>(null);

  const queryParams: Record<string, unknown> = { page: params.page, limit: 20 };
  if (params.status) queryParams.status = params.status;
  if (params.q) queryParams.q = params.q;

  const { data, isLoading } = useAdminInquiries(queryParams);
  const patchStatus = usePatchInquiryStatus();
  const del = useDeleteInquiry();

  const rows = data?.data || [];

  const handleOpenInquiry = (inquiry: ApiInquiry) => {
    setSelectedInquiry(inquiry);
    if (inquiry.status === "unread") {
      patchStatus.mutate({ id: inquiry.id, status: "read" });
    }
  };

  async function toggleStatus(id: string, currentStatus: "unread" | "read") {
    const next = currentStatus === "unread" ? "read" : "unread";
    try {
      await patchStatus.mutateAsync({ id, status: next });
      toast.success(next === "read" ? "Marked as read" : "Marked as unread");
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => prev ? { ...prev, status: next } : null);
      }
    } catch (err) {
      toast.error(apiError(err, "Update failed"));
    }
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "Delete this inquiry permanently?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(id);
      toast.success("Inquiry deleted");
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(null);
      }
    } catch (err) {
      toast.error(apiError(err, "Delete failed"));
    }
  }

  return (
    <>
      <Topbar title="Customer Inquiries" />
      <div className="p-6">
        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              className="input pl-8 max-w-[260px]"
              placeholder="Search inquiries…"
              value={params.q}
              onChange={(e) => setParams((p) => ({ ...p, q: e.target.value, page: 1 }))}
            />
          </div>
          <select
            className="input max-w-[140px] bg-white"
            value={params.status}
            onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}
          >
            <option value="">All statuses</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <span className="text-sm text-neutral-500 ml-auto">
            {isLoading ? "Loading…" : `${data?.total || 0} inquiry${(data?.total || 0) !== 1 ? "ies" : ""}`}
          </span>
        </div>

        {/* Empty state */}
        {!isLoading && rows.length === 0 && (
          <div className="card p-10 text-center text-sm text-neutral-400">
            {params.status || params.q ? "No inquiries match your filters." : "No inquiries yet."}
          </div>
        )}

        {/* Inquiries list */}
        <div className="space-y-3">
          {rows.map((inq) => (
            <div
              key={inq.id}
              className={`card p-5 transition hover:shadow-md cursor-pointer border-l-4 ${
                inq.status === "unread" ? "border-l-blue-500 bg-blue-50/10" : "border-l-neutral-300"
              }`}
              onClick={() => handleOpenInquiry(inq)}
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                      inq.status === "unread" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {inq.status}
                    </span>
                    <span className="text-[10px] font-medium tracking-wide uppercase bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                      {inq.topic}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {new Date(inq.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-neutral-800 text-sm truncate">{inq.subject}</h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    by <span className="font-semibold text-neutral-700">{inq.firstName} {inq.lastName}</span> &middot; <span className="underline">{inq.email}</span>
                  </p>
                  <p className="text-xs text-neutral-600 mt-3 line-clamp-2 leading-relaxed">
                    {inq.message}
                  </p>
                </div>

                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleStatus(inq.id, inq.status)}
                    title={inq.status === "unread" ? "Mark as Read" : "Mark as Unread"}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition"
                  >
                    <Check className={`w-4 h-4 ${inq.status === "read" ? "text-emerald-600" : ""}`} />
                  </button>
                  <button
                    onClick={() => onDelete(inq.id)}
                    title="Delete Inquiry"
                    className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
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

      {/* Drawer / Detail View Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-end" onClick={() => setSelectedInquiry(null)}>
          <div
            className="bg-white w-full max-w-[550px] h-full p-6 shadow-2xl overflow-y-auto flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-widest">Inquiry Details</span>
                <h3 className="font-bold text-neutral-800 text-lg mt-0.5">View Message</h3>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 py-6">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 border border-neutral-200 rounded-lg text-xs">
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Sender</span>
                  <span className="font-bold text-neutral-800 block">{selectedInquiry.firstName} {selectedInquiry.lastName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Email</span>
                  <a href={`mailto:${selectedInquiry.email}`} className="font-bold text-blue-600 hover:underline block truncate">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Topic</span>
                  <span className="font-bold text-neutral-800 block">{selectedInquiry.topic}</span>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Date</span>
                  <span className="font-bold text-neutral-800 block">
                    {new Date(selectedInquiry.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">Subject</span>
                <h4 className="font-bold text-neutral-800 text-base">{selectedInquiry.subject}</h4>
              </div>

              <div>
                <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-2">Message Body</span>
                <p className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap bg-neutral-50/50 p-4 border border-neutral-100 rounded-lg">
                  {selectedInquiry.message}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-neutral-200 flex justify-between gap-3">
              <button
                onClick={() => toggleStatus(selectedInquiry.id, selectedInquiry.status)}
                className="btn-outline text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {selectedInquiry.status === "unread" ? "Mark as Read" : "Mark as Unread"}
              </button>

              <div className="flex gap-2">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=RE: ${encodeURIComponent(selectedInquiry.subject)}`}
                  className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Reply
                </a>
                <button
                  onClick={() => onDelete(selectedInquiry.id)}
                  className="btn-danger text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
