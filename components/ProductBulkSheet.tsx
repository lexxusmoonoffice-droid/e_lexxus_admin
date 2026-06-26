"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Copy, ImagePlus, FileArchive,
  X, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
} from "lucide-react";
import Topbar from "@/components/Topbar";
import RichEditor from "@/components/RichEditor";
import { useAdminCategories, useCreateProduct, apiError } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ApiCategory } from "@/lib/types";

/* ── Types ──────────────────────────────────────────────────────────────────── */

type Status = "draft" | "review" | "published" | "removed";

type SheetRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  price: number;
  status: Status;
  tags: string[];
  // images
  pendingThumb: File | null;
  thumbPreview: string | null;
  pendingHover: File | null;
  hoverPreview: string | null;
  pendingGallery: File[];
  galleryPreviews: string[];
  // zip
  pendingZip: File | null;
  // UI
  expanded: boolean;
};

type UploadStep = {
  label: string;
  status: "pending" | "uploading" | "done" | "error";
  pct: number;
};

type ProductProgress = {
  title: string;
  steps: UploadStep[];
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */

let _uid = 0;
function uid() { return `row-${++_uid}`; }

function makeRow(partial: Partial<SheetRow> = {}): SheetRow {
  return {
    id: uid(),
    title: "",
    description: "",
    category: "",
    subCategory: "",
    price: 0,
    status: "draft",
    tags: [],
    pendingThumb: null,
    thumbPreview: null,
    pendingHover: null,
    hoverPreview: null,
    pendingGallery: [],
    galleryPreviews: [],
    pendingZip: null,
    expanded: false,
    ...partial,
  };
}

function isValid(row: SheetRow) {
  return row.title.trim() !== "" && row.category !== "" && row.price >= 0 && row.title.trim().length <= 160;
}

function hasData(row: SheetRow) {
  return row.title !== "" || row.category !== "" || row.price > 0;
}

const STATUS_STYLE: Record<Status, string> = {
  draft:     "bg-neutral-100 text-neutral-600",
  review:    "bg-yellow-100 text-yellow-800",
  published: "bg-emerald-100 text-emerald-800",
  removed:   "bg-rose-100 text-rose-800",
};

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ProductBulkSheet() {
  const router = useRouter();
  const cats = useAdminCategories();
  const allCats: ApiCategory[] = cats.data?.data || [];
  const topCats = allCats.filter((c) => !c.parent);
  const createProduct = useCreateProduct();

  const [rows, setRows] = useState<SheetRow[]>([makeRow()]);
  const [saving, setSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<ProductProgress[]>([]);

  const thumbRefs   = useRef<Record<string, HTMLInputElement | null>>({});
  const hoverRefs   = useRef<Record<string, HTMLInputElement | null>>({});
  const galleryRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const zipRefs     = useRef<Record<string, HTMLInputElement | null>>({});

  /* ── Row mutations ─────────────────────────────────────────────────────────── */

  function updateRow(id: string, patch: Partial<SheetRow>) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  function addRow(copyFrom?: SheetRow) {
    const base: Partial<SheetRow> = copyFrom
      ? { category: copyFrom.category, subCategory: copyFrom.subCategory, status: copyFrom.status, tags: [...copyFrom.tags], price: copyFrom.price }
      : {};
    setRows((prev) => [...prev, makeRow(base)]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      if (prev.length === 1) return [makeRow()];
      return prev.filter((r) => r.id !== id);
    });
  }

  function duplicateRow(row: SheetRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      const copy = makeRow({
        ...row,
        title: row.title ? `${row.title} (copy)` : "",
        // reset files — File objects can't be safely cloned across rows
        pendingThumb: null, thumbPreview: null,
        pendingHover: null, hoverPreview: null,
        pendingGallery: [], galleryPreviews: [],
        pendingZip: null,
        expanded: false,
      });
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, expanded: !r.expanded } : r));
  }

  /* ── File select handlers ──────────────────────────────────────────────────── */

  function onThumbSelect(id: string, file: File) {
    updateRow(id, { pendingThumb: file, thumbPreview: URL.createObjectURL(file) });
  }

  function onHoverSelect(id: string, file: File) {
    updateRow(id, { pendingHover: file, hoverPreview: URL.createObjectURL(file) });
  }

  function onGallerySelect(id: string, files: File[]) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const newFiles = [...r.pendingGallery, ...files];
      const newPreviews = [...r.galleryPreviews, ...files.map((f) => URL.createObjectURL(f))];
      return { ...r, pendingGallery: newFiles, galleryPreviews: newPreviews };
    }));
  }

  function removeGalleryItem(id: string, idx: number) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        pendingGallery: r.pendingGallery.filter((_, i) => i !== idx),
        galleryPreviews: r.galleryPreviews.filter((_, i) => i !== idx),
      };
    }));
  }

  function onZipSelect(id: string, file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only ZIP files are allowed");
      return;
    }
    updateRow(id, { pendingZip: file });
  }

  /* ── Batch save ────────────────────────────────────────────────────────────── */

  const validRows = rows.filter(isValid);
  const errorRows = rows.filter((r) => hasData(r) && !isValid(r));

  function patchStep(batchIdx: number, stepIdx: number, patch: Partial<UploadStep>) {
    setBatchProgress((prev) =>
      prev.map((p, pi) =>
        pi !== batchIdx ? p : {
          ...p,
          steps: p.steps.map((s, si) => si !== stepIdx ? s : { ...s, ...patch }),
        },
      ),
    );
  }

  async function uploadImg(
    file: File, productId: string, role: string,
    onProgress: (pct: number) => void,
  ): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "product");
    fd.append("refId", productId);
    fd.append("role", role);
    const r = await api.post<{ urls: { full?: string; original: string } }>(
      "/uploads/image", fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
      },
    );
    return r.data.urls.full || r.data.urls.original;
  }

  async function save() {
    if (validRows.length === 0) {
      toast.error("No valid products — fill in Title, Category and Price first.");
      return;
    }
    setSaving(true);

    const initialProgress: ProductProgress[] = validRows.map((row) => ({
      title: row.title,
      steps: [
        { label: "Creating product",                                                    status: "pending", pct: 0 },
        ...(row.pendingThumb                  ? [{ label: "Thumbnail",                  status: "pending" as const, pct: 0 }] : []),
        ...(row.pendingHover                  ? [{ label: "Hover image",                status: "pending" as const, pct: 0 }] : []),
        ...(row.pendingGallery.length > 0     ? [{ label: `Gallery (${row.pendingGallery.length} images)`, status: "pending" as const, pct: 0 }] : []),
        ...(row.pendingZip                    ? [{ label: `ZIP — ${row.pendingZip.name}`, status: "pending" as const, pct: 0 }] : []),
      ],
    }));
    setBatchProgress(initialProgress);

    let created = 0;
    let failed  = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      /* Step 0 — create product record */
      patchStep(i, 0, { status: "uploading", pct: 50 });
      let pid: string;
      try {
        const res = await createProduct.mutateAsync({
          title:       row.title,
          description: row.description,
          price:       Number(row.price) || 0,
          status:      row.status,
          category:    row.category,
          subCategory: row.subCategory || null,
          tags:        row.tags,
        } as Parameters<typeof createProduct.mutateAsync>[0]);
        pid = res.product.id;
        patchStep(i, 0, { status: "done", pct: 100 });
      } catch (err) {
        patchStep(i, 0, { status: "error", pct: 0 });
        toast.error(`"${row.title}" — ${apiError(err, "Failed to create")}`);
        failed++;
        continue;
      }

      const updates: Record<string, unknown> = {};
      let si = 1;

      /* Thumbnail */
      if (row.pendingThumb) {
        patchStep(i, si, { status: "uploading" });
        try {
          updates.thumbnail = await uploadImg(row.pendingThumb, pid, "thumbnail", (pct) => patchStep(i, si, { pct }));
          patchStep(i, si, { status: "done", pct: 100 });
        } catch { patchStep(i, si, { status: "error" }); }
        si++;
      }

      /* Hover image */
      if (row.pendingHover) {
        patchStep(i, si, { status: "uploading" });
        try {
          updates.hoverImage = await uploadImg(row.pendingHover, pid, "hover", (pct) => patchStep(i, si, { pct }));
          patchStep(i, si, { status: "done", pct: 100 });
        } catch { patchStep(i, si, { status: "error" }); }
        si++;
      }

      /* Gallery images */
      if (row.pendingGallery.length > 0) {
        patchStep(i, si, { status: "uploading" });
        const galleryUrls: string[] = [];
        let done = 0;
        await Promise.all(
          row.pendingGallery.map(async (file) => {
            try {
              const url = await uploadImg(file, pid, "gallery", () => {
                done++;
                patchStep(i, si, { pct: Math.round((done / row.pendingGallery.length) * 100) });
              });
              galleryUrls.push(url);
            } catch { /* partial failure ok */ }
          }),
        );
        if (galleryUrls.length > 0) updates.images = galleryUrls;
        patchStep(i, si, { status: "done", pct: 100 });
        si++;
      }

      /* ZIP */
      if (row.pendingZip) {
        patchStep(i, si, { status: "uploading" });
        try {
          const fd = new FormData();
          fd.append("file", row.pendingZip);
          fd.append("productId", pid);
          const r = await api.post<{ fileSizeMb: number }>(
            "/uploads/product-file", fd,
            {
              headers: { "Content-Type": "multipart/form-data" },
              onUploadProgress: (e) => { if (e.total) patchStep(i, si, { pct: Math.round((e.loaded / e.total) * 100) }); },
            },
          );
          updates.fileSizeMb = r.data.fileSizeMb;
          patchStep(i, si, { status: "done", pct: 100 });
        } catch { patchStep(i, si, { status: "error" }); }
        si++;
      }

      /* Patch URLs */
      if (Object.keys(updates).length > 0) {
        try { await api.put(`/admin/products/${pid}`, updates); } catch { /* acceptable */ }
      }
      created++;
    }

    setSaving(false);
    if (created > 0) {
      toast.success(`${created} product${created !== 1 ? "s" : ""} created`);
      setTimeout(() => router.push("/products"), 1400);
    }
    if (failed > 0) toast.error(`${failed} product${failed !== 1 ? "s" : ""} failed`);
  }

  /* ── Render ─────────────────────────────────────────────────────────────────── */

  const overallDone = batchProgress.length > 0 &&
    batchProgress.every((p) => p.steps.every((s) => s.status === "done" || s.status === "error"));

  return (
    <>
      {/* Batch progress overlay */}
      {(saving || batchProgress.length > 0) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-1">
              {overallDone
                ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                : <span className="w-5 h-5 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin shrink-0" />}
              <h2 className="text-lg font-semibold">
                {overallDone ? "All done!" : `Creating ${batchProgress.length} product${batchProgress.length !== 1 ? "s" : ""}…`}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mb-6 pl-8">
              {overallDone ? "Redirecting to products list…" : "Keep this page open until complete."}
            </p>
            <div className="space-y-5">
              {batchProgress.map((ps, pi) => {
                const allDone  = ps.steps.every((s) => s.status === "done");
                const hasError = ps.steps.some((s) => s.status === "error");
                const overall  = Math.round(ps.steps.reduce((sum, s) => sum + s.pct, 0) / ps.steps.length);
                return (
                  <div key={pi}>
                    <div className="flex items-center gap-2 mb-2">
                      {allDone  ? <CheckCircle  className="w-4 h-4 text-emerald-500 shrink-0" /> :
                       hasError ? <AlertCircle  className="w-4 h-4 text-rose-500 shrink-0"    /> :
                                  <span className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />}
                      <span className="text-sm font-medium truncate flex-1">{ps.title}</span>
                      <span className={`text-xs tabular-nums ${allDone ? "text-emerald-600" : hasError ? "text-rose-500" : "text-neutral-400"}`}>
                        {allDone ? "Done" : hasError ? "Partial" : `${overall}%`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-300 ${allDone ? "bg-emerald-400" : hasError ? "bg-rose-400" : "bg-indigo-400"}`}
                        style={{ width: `${overall}%` }} />
                    </div>
                    <div className="pl-4 space-y-1">
                      {ps.steps.map((step, sti) => (
                        <div key={sti} className="flex items-center gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            step.status === "done"      ? "bg-emerald-500" :
                            step.status === "error"     ? "bg-rose-500"    :
                            step.status === "uploading" ? "bg-indigo-500 animate-pulse" :
                            "bg-neutral-200"}`} />
                          <span className={step.status === "error" ? "text-rose-600" : step.status === "done" ? "text-emerald-700" : "text-neutral-500"}>
                            {step.label}
                          </span>
                          <span className="ml-auto tabular-nums text-neutral-400">
                            {step.status === "done"      ? "Done"          :
                             step.status === "error"     ? "Failed"        :
                             step.status === "uploading" ? `${step.pct}%`  : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Topbar title="Add products — Spreadsheet" />

      <div className="p-4 space-y-3 max-w-[1600px]">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">{rows.length} rows</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {validRows.length} ready
            </span>
            {errorRows.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                {errorRows.length} with errors
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => addRow()} className="btn-outline flex items-center gap-1.5 text-sm py-1.5">
              <Plus className="w-4 h-4" /> Add row
            </button>
            <button
              onClick={save}
              disabled={saving || validRows.length === 0}
              className="btn-primary disabled:opacity-50 text-sm py-1.5"
            >
              {saving ? "Creating…" : `Create ${validRows.length} product${validRows.length !== 1 ? "s" : ""}`}
            </button>
            <Link href="/products" className="btn-outline text-sm py-1.5">
              <X className="w-4 h-4 mr-1 inline" />Cancel
            </Link>
          </div>
        </div>

        {/* Spreadsheet */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#1a1a2e] text-[#c8cce0] text-[11px] select-none">
                  <th className="w-10 text-center py-2.5 px-2 font-medium border-r border-[#2d2d4e]">#</th>
                  <th className="w-7 border-r border-[#2d2d4e]" title="Row validity" />
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[200px]">
                    A — Title <span className="text-red-400">*</span>
                  </th>
                  <th className="w-9 text-center py-2.5 px-2 font-medium border-r border-[#2d2d4e]" title="Description">Desc</th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[140px]">
                    B — Category <span className="text-red-400">*</span>
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[120px]">C — Subcategory</th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] w-32">
                    D — Price ₹ <span className="text-red-400">*</span>
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] w-28">E — Status</th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[160px]">F — Tags</th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[260px]">
                    G — Images
                    <span className="ml-1.5 text-[10px] text-[#8890b0] font-normal">Thumb · Hover · Gallery</span>
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium border-r border-[#2d2d4e] min-w-[150px]">H — ZIP file</th>
                  <th className="w-20 py-2.5 px-2 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const valid   = isValid(row);
                  const anyData = hasData(row);
                  const subCats = allCats.filter((c) => c.parent === row.category);

                  return (
                    <React.Fragment key={row.id}>
                      {/* ── Data row ── */}
                      <tr className={`border-b border-neutral-100 hover:bg-indigo-50/20 transition-colors group ${
                        valid   ? "border-l-4 border-l-emerald-400" :
                        anyData ? "border-l-4 border-l-rose-400"    :
                                  "border-l-4 border-l-neutral-200"
                      }`}>

                        {/* # */}
                        <td className="text-center text-[11px] text-neutral-400 bg-neutral-50 border-r border-neutral-100 font-medium py-1.5 px-2 select-none">
                          {idx + 1}
                        </td>

                        {/* Dot */}
                        <td className="border-r border-neutral-100 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${valid ? "bg-emerald-500" : anyData ? "bg-rose-500" : "bg-neutral-300"}`}
                            title={valid ? "Ready" : anyData ? "Missing required fields" : "Empty"} />
                        </td>

                        {/* Title */}
                        <td className={`border-r border-neutral-100 ${!valid && anyData && !row.title.trim() ? "bg-rose-50" : ""}`}>
                          <input
                            className="w-full px-3 py-2 text-sm outline-none bg-transparent placeholder:text-neutral-300 focus:bg-indigo-50/30"
                            value={row.title}
                            maxLength={160}
                            placeholder="Product title…"
                            onChange={(e) => updateRow(row.id, { title: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                          />
                        </td>

                        {/* Description toggle */}
                        <td className="border-r border-neutral-100 text-center">
                          <button
                            onClick={() => toggleExpand(row.id)}
                            title={row.expanded ? "Collapse description" : "Edit description"}
                            className={`mx-auto p-1 rounded transition-colors ${
                              row.description ? "text-indigo-500 hover:bg-indigo-100" : "text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100"}`}
                          >
                            {row.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Category */}
                        <td className={`border-r border-neutral-100 ${!valid && anyData && !row.category ? "bg-rose-50" : ""}`}>
                          <select
                            className="w-full px-3 py-2 text-sm outline-none bg-transparent cursor-pointer"
                            value={row.category}
                            onChange={(e) => updateRow(row.id, { category: e.target.value, subCategory: "" })}
                          >
                            <option value="">Choose…</option>
                            {topCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>

                        {/* Subcategory */}
                        <td className="border-r border-neutral-100">
                          <select
                            className="w-full px-3 py-2 text-sm outline-none bg-transparent text-neutral-600 cursor-pointer disabled:opacity-40"
                            value={row.subCategory}
                            disabled={subCats.length === 0}
                            onChange={(e) => updateRow(row.id, { subCategory: e.target.value })}
                          >
                            <option value="">— All —</option>
                            {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>

                        {/* Price */}
                        <td className={`border-r border-neutral-100 ${!valid && anyData && row.price < 0 ? "bg-rose-50" : ""}`}>
                          <div className="flex items-center px-3 py-2 gap-1">
                            <span className="text-xs text-neutral-400 shrink-0">₹</span>
                            <input
                              type="number" min={0}
                              className="w-full text-sm outline-none bg-transparent tabular-nums"
                              value={row.price === 0 ? "" : row.price}
                              placeholder="0"
                              onChange={(e) => updateRow(row.id, { price: Number(e.target.value) || 0 })}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="border-r border-neutral-100 px-2 py-1.5">
                          <select
                            className={`w-full text-xs rounded-full px-2.5 py-1 outline-none font-medium cursor-pointer border-0 ${STATUS_STYLE[row.status]}`}
                            value={row.status}
                            onChange={(e) => updateRow(row.id, { status: e.target.value as Status })}
                          >
                            <option value="draft">Draft</option>
                            <option value="review">Review</option>
                            <option value="published">Published</option>
                            <option value="removed">Removed</option>
                          </select>
                        </td>

                        {/* Tags */}
                        <td className="border-r border-neutral-100">
                          <MiniTagInput tags={row.tags} onChange={(tags) => updateRow(row.id, { tags })} />
                        </td>

                        {/* ── Images — Thumb + Hover + Gallery ── */}
                        <td className="border-r border-neutral-100">
                          {/* Hidden file inputs */}
                          <input ref={(el) => { thumbRefs.current[row.id] = el; }} type="file"
                            accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onThumbSelect(row.id, f); e.target.value = ""; }} />
                          <input ref={(el) => { hoverRefs.current[row.id] = el; }} type="file"
                            accept="image/jpeg,image/png,image/webp" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) onHoverSelect(row.id, f); e.target.value = ""; }} />
                          <input ref={(el) => { galleryRefs.current[row.id] = el; }} type="file"
                            accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length) onGallerySelect(row.id, files);
                              e.target.value = "";
                            }} />

                          <div className="flex items-center gap-1.5 px-2 py-2 flex-wrap">
                            {/* Thumbnail slot */}
                            <MiniImgSlot
                              preview={row.thumbPreview}
                              label="Thumb"
                              badgeColor="neutral"
                              onClick={() => thumbRefs.current[row.id]?.click()}
                              onRemove={() => updateRow(row.id, { pendingThumb: null, thumbPreview: null })}
                            />

                            {/* Hover slot */}
                            <MiniImgSlot
                              preview={row.hoverPreview}
                              label="Hover"
                              badgeColor="violet"
                              onClick={() => hoverRefs.current[row.id]?.click()}
                              onRemove={() => updateRow(row.id, { pendingHover: null, hoverPreview: null })}
                            />

                            {/* Divider */}
                            <span className="w-px h-8 bg-neutral-100 shrink-0" />

                            {/* Gallery slots */}
                            {row.galleryPreviews.map((preview, gi) => (
                              <MiniImgSlot
                                key={gi}
                                preview={preview}
                                label={`#${gi + 1}`}
                                badgeColor="neutral"
                                onClick={() => {}}
                                onRemove={() => removeGalleryItem(row.id, gi)}
                              />
                            ))}

                            {/* Add gallery button */}
                            <button
                              onClick={() => galleryRefs.current[row.id]?.click()}
                              title="Add gallery images"
                              className="flex flex-col items-center gap-0.5 group/add"
                            >
                              <span className="w-9 h-9 rounded-md border-2 border-dashed border-neutral-200 hover:border-indigo-400 flex items-center justify-center transition-colors bg-neutral-50 hover:bg-indigo-50">
                                <Plus className="w-3.5 h-3.5 text-neutral-400 group-hover/add:text-indigo-500" />
                              </span>
                              <span className="text-[9px] text-neutral-400">Gallery</span>
                            </button>
                          </div>
                        </td>

                        {/* ZIP */}
                        <td className="border-r border-neutral-100">
                          <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
                            <input ref={(el) => { zipRefs.current[row.id] = el; }} type="file"
                              accept=".zip,application/zip" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) onZipSelect(row.id, f); e.target.value = ""; }} />
                            {row.pendingZip ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileArchive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-xs text-neutral-600 truncate">{row.pendingZip.name}</span>
                                <button onClick={() => updateRow(row.id, { pendingZip: null })}
                                  className="text-neutral-300 hover:text-rose-500 shrink-0">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => zipRefs.current[row.id]?.click()}
                                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors">
                                <FileArchive className="w-3.5 h-3.5" /> Upload…
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center gap-0.5 px-2 py-1.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => duplicateRow(row)} title="Duplicate row"
                              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeRow(row.id)} title="Delete row"
                              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Description expanded panel ── */}
                      {row.expanded && (
                        <tr className="bg-indigo-50/30 border-b border-indigo-100">
                          <td colSpan={12} className="p-4 pl-16">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-indigo-700">
                                Description — Row {idx + 1}
                                {row.title && <span className="font-normal text-indigo-500 ml-1">· {row.title}</span>}
                              </span>
                              <button onClick={() => toggleExpand(row.id)}
                                className="ml-auto text-xs text-neutral-400 hover:text-neutral-700 flex items-center gap-1 transition-colors">
                                <X className="w-3 h-3" /> Collapse
                              </button>
                            </div>
                            <RichEditor
                              value={row.description}
                              onChange={(v) => updateRow(row.id, { description: v })}
                              placeholder="Describe the product — what's included, formats, poly count…"
                              minHeight={140}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add row footer */}
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 border-t border-neutral-100 transition-colors text-left"
            onClick={() => addRow()}
          >
            <Plus className="w-4 h-4" />
            Add product row
            <span className="ml-auto text-xs text-neutral-300">↵ Enter in last Title cell</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-neutral-400 flex-wrap">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" /> Ready — will be created</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" /> Missing required fields</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-300 shrink-0" /> Empty — skipped</div>
          <span className="text-neutral-200">·</span>
          <span>G — Images: <span className="text-neutral-500">Thumb</span> · <span className="text-violet-400">Hover</span> · Gallery (unlimited)</span>
        </div>

        {/* Bottom save bar */}
        <div className="flex gap-3 items-center pt-2 border-t border-neutral-100">
          <button
            onClick={save}
            disabled={saving || validRows.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? "Creating…" : `Create ${validRows.length} product${validRows.length !== 1 ? "s" : ""}`}
          </button>
          <Link href="/products" className="btn-outline">
            <X className="w-4 h-4 mr-1 inline" /> Cancel
          </Link>
          {errorRows.length > 0 && (
            <span className="text-xs text-rose-600 ml-2">
              {errorRows.length} row{errorRows.length !== 1 ? "s" : ""} have missing fields and will be skipped.
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* ── MiniImgSlot ─────────────────────────────────────────────────────────────── */

function MiniImgSlot({
  preview, label, badgeColor, onClick, onRemove,
}: {
  preview: string | null;
  label: string;
  badgeColor: "neutral" | "violet";
  onClick: () => void;
  onRemove: () => void;
}) {
  const accentClass = badgeColor === "violet"
    ? "border-violet-200 hover:border-violet-400 bg-violet-50 text-violet-400"
    : "border-neutral-200 hover:border-neutral-400 bg-neutral-50 text-neutral-400";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        onClick={preview ? undefined : onClick}
        className={`relative w-9 h-9 rounded-md overflow-hidden border-2 transition-colors ${
          preview ? "border-neutral-200 cursor-default" : `border-dashed cursor-pointer ${accentClass}`
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="w-full h-full object-cover" />
            {/* Remove × appears on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors text-white text-xs font-bold opacity-0 hover:opacity-100"
              title={`Remove ${label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImagePlus className={`w-3.5 h-3.5 ${badgeColor === "violet" ? "text-violet-400" : "text-neutral-400"}`} />
          </div>
        )}
      </div>
      <span className={`text-[9px] font-medium ${badgeColor === "violet" ? "text-violet-400" : "text-neutral-400"}`}>
        {label}
      </span>
    </div>
  );
}

/* ── MiniTagInput ────────────────────────────────────────────────────────────── */

function MiniTagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const pieces = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!pieces.length) return;
    const seen = new Set(tags.map((t) => t.toLowerCase()));
    const next = [...tags];
    for (const p of pieces) {
      if (p.length > 32 || seen.has(p.toLowerCase())) continue;
      seen.add(p.toLowerCase());
      next.push(p);
    }
    if (next.length !== tags.length) onChange(next.slice(0, 20));
    setDraft("");
  }

  if (!editing) {
    return (
      <div
        className="px-3 py-2 flex items-center gap-1 flex-wrap cursor-text min-h-[36px]"
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 10); }}
      >
        {tags.slice(0, 3).map((t) => (
          <span key={t} className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-full text-neutral-600 flex items-center gap-0.5">
            {t}
            <button onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)); }} className="hover:text-rose-500 ml-0.5">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {tags.length > 3 && <span className="text-[10px] text-neutral-400">+{tags.length - 3}</span>}
        {tags.length === 0 && <span className="text-xs text-neutral-300">Tags…</span>}
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5 flex flex-col gap-1.5 bg-white border border-indigo-400 rounded-md shadow-md z-10 min-w-[170px]">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              {t}
              <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-rose-500">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); }
          if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
          if (e.key === "Escape" || e.key === "Tab") { if (draft) commit(draft); setEditing(false); }
        }}
        onBlur={() => { if (draft) commit(draft); setEditing(false); }}
        placeholder="Add tag, press Enter…"
        className="text-xs outline-none w-full bg-transparent"
        maxLength={32}
      />
    </div>
  );
}
