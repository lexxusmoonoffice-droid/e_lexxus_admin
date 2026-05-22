"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { X, Tag as TagIcon, ImagePlus, FileArchive, CheckCircle } from "lucide-react";
import Topbar from "@/components/Topbar";
import RichEditor from "@/components/RichEditor";
import {
  useAdminBrands,
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
  apiError,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ApiProduct, ApiCategory } from "@/lib/types";

type Form = {
  title: string;
  slug?: string;
  description: string;
  price: number;
  status: "draft" | "review" | "published" | "removed";
  brand?: string;
  category?: string;
  subCategory?: string | null;
  thumbnail?: string;
  hoverImage?: string;
  images: string[];
  fileSizeMb?: number;
  tags?: string[];
};

type PendingFile = { file: File; previewUrl: string };

function productToForm(p?: ApiProduct): Form {
  return {
    title: p?.title || "",
    slug: p?.slug,
    description: p?.description || "",
    price: p?.price ?? 0,
    status: (p?.status as Form["status"]) || "draft",
    brand: typeof p?.brand === "string" ? p?.brand : p?.brand?.id,
    category: typeof p?.category === "string" ? p?.category : p?.category?.id,
    subCategory:
      typeof p?.subCategory === "string"
        ? p?.subCategory
        : (p?.subCategory as ApiCategory)?.id ?? null,
    thumbnail: p?.thumbnail,
    hoverImage: p?.hoverImage,
    images: p?.images || [],
    fileSizeMb: p?.fileSizeMb,
    tags: p?.tags || [],
  };
}

export default function ProductForm({
  mode,
  existing,
}: {
  mode: "new" | "edit";
  existing?: ApiProduct;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(productToForm(existing));
  useEffect(() => { if (existing) setForm(productToForm(existing)); }, [existing]);

  // Pending files (queued in "new" mode, uploaded on save)
  const [pendingThumb, setPendingThumb] = useState<PendingFile | null>(null);
  const [pendingHover, setPendingHover] = useState<PendingFile | null>(null);
  const [pendingGallery, setPendingGallery] = useState<PendingFile[]>([]);
  const [pendingZip, setPendingZip] = useState<File | null>(null);

  // Upload progress keys: "thumb" | "hover" | "gallery-N" | "zip"
  const [prog, setProg] = useState<Record<string, number>>({});
  const setP = (key: string, v: number) => setProg((p) => ({ ...p, [key]: v }));

  const brands = useAdminBrands();
  const cats = useAdminCategories();
  const createM = useCreateProduct();
  const updateM = useUpdateProduct(existing?.id || "");
  const [saving, setSaving] = useState(false);
  const busy = saving || createM.isPending || updateM.isPending;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const errors = useMemo(
    () => ({
      title: !form.title.trim()
        ? "Title is required"
        : form.title.length > 160
          ? "Max 160 characters"
          : null,
      category: !form.category ? "Category is required" : null,
      price: form.price < 0 ? "Price can't be negative" : null,
    }),
    [form.title, form.category, form.price],
  );
  const hasErrors = Object.values(errors).some(Boolean);

  function makePending(file: File): PendingFile {
    return { file, previewUrl: URL.createObjectURL(file) };
  }

  // ── Upload helpers ──────────────────────────────────────────────────────────

  async function uploadImg(
    file: File,
    productId: string,
    role: string,
    key: string,
  ): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "product");
    fd.append("refId", productId);
    fd.append("role", role);
    const res = await api.post<{ urls: { full?: string; original: string } }>(
      "/uploads/image",
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setP(key, Math.round((e.loaded / e.total!) * 100));
        },
      },
    );
    setP(key, 100);
    return res.data.urls.full || res.data.urls.original;
  }

  async function uploadZip(file: File, productId: string): Promise<number> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productId", productId);
    const res = await api.post<{ fileSizeMb: number }>(
      "/uploads/product-file",
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setP("zip", Math.round((e.loaded / e.total!) * 100));
        },
      },
    );
    setP("zip", 100);
    return res.data.fileSizeMb;
  }

  // Edit mode: immediate upload on file select
  async function editUploadImg(file: File, role: "thumbnail" | "hover" | "gallery") {
    if (!existing?.id) return;
    const key = role === "gallery" ? `gallery-${Date.now()}` : role;
    try {
      const url = await uploadImg(file, existing.id, role, key);
      if (role === "thumbnail") set("thumbnail", url);
      else if (role === "hover") set("hoverImage", url);
      else set("images", [...form.images, url]);
    } catch (err) {
      toast.error(apiError(err, "Upload failed"));
      setP(key, 0);
    }
  }

  async function editUploadZip(file: File) {
    if (!existing?.id) return;
    try {
      const sizeMb = await uploadZip(file, existing.id);
      set("fileSizeMb", sizeMb);
      toast.success("ZIP uploaded");
    } catch (err) {
      toast.error(apiError(err, "Upload failed"));
      setP("zip", 0);
    }
  }

  // File select handlers — new: queue, edit: upload immediately
  function onThumbSelect(file: File) {
    if (mode === "new") setPendingThumb(makePending(file));
    else editUploadImg(file, "thumbnail");
  }
  function onHoverSelect(file: File) {
    if (mode === "new") setPendingHover(makePending(file));
    else editUploadImg(file, "hover");
  }
  function onGallerySelect(file: File) {
    if (mode === "new") setPendingGallery((prev) => [...prev, makePending(file)]);
    else editUploadImg(file, "gallery");
  }
  function onZipSelect(file: File) {
    if (mode === "new") setPendingZip(file);
    else editUploadZip(file);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function save() {
    if (hasErrors) return;
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price) || 0,
      status: form.status,
      brand: form.brand || undefined,
      category: form.category,
      subCategory: form.subCategory || null,
      thumbnail: form.thumbnail,
      hoverImage: form.hoverImage,
      images: form.images,
      fileSizeMb: form.fileSizeMb,
      tags: form.tags,
    };

    try {
      if (mode === "new") {
        const res = await createM.mutateAsync(payload);
        const pid = res.product.id;

        // Upload queued files sequentially (show progress per item)
        const updates: Record<string, unknown> = {};
        try {
          if (pendingThumb) {
            updates.thumbnail = await uploadImg(pendingThumb.file, pid, "thumbnail", "thumb");
          }
          if (pendingHover) {
            updates.hoverImage = await uploadImg(pendingHover.file, pid, "hover", "hover");
          }
          if (pendingGallery.length > 0) {
            updates.images = await Promise.all(
              pendingGallery.map((p, i) =>
                uploadImg(p.file, pid, "gallery", `gallery-${i}`),
              ),
            );
          }
          if (pendingZip) {
            updates.fileSizeMb = await uploadZip(pendingZip, pid);
          }
          if (Object.keys(updates).length > 0) {
            await api.put(`/admin/products/${pid}`, { ...payload, ...updates });
          }
        } catch {
          toast.error("Product created — but some uploads failed. Re-upload from the edit page.");
        }

        toast.success("Product created");
        router.push(`/products/${pid}`);
      } else {
        await updateM.mutateAsync(payload);
        toast.success("Saved");
      }
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  // Computed display URLs
  const thumbUrl = pendingThumb?.previewUrl || form.thumbnail;
  const hoverUrl = pendingHover?.previewUrl || form.hoverImage;

  return (
    <>
      <Topbar title={mode === "new" ? "New product" : `Edit: ${form.title || "…"}`} />
      <div className="p-6 space-y-6 max-w-[1100px]">

        {/* Basic info */}
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Basic info</h3>
          <Field label="Title" required error={errors.title}>
            <input
              className={`input ${errors.title ? "border-rose-500" : ""}`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Sofa Harlem"
              maxLength={160}
            />
          </Field>
          {form.slug && (
            <Field label="Slug (auto-generated)">
              <input className="input" value={form.slug} readOnly disabled />
            </Field>
          )}
          <div className="block">
            <span className="label">Description</span>
            <RichEditor
              value={form.description}
              onChange={(v: string) => set("description", v)}
              placeholder="Describe the product — what's included, formats, poly count…"
              minHeight={180}
            />
          </div>
        </section>

        {/* Organization */}
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Organization</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CategorySelector
              allCats={cats.data?.data || []}
              categoryId={form.category || ""}
              subCategoryId={form.subCategory || ""}
              error={errors.category}
              onChangeCategory={(catId, subCatId) =>
                setForm((f) => ({ ...f, category: catId, subCategory: subCatId || null }))
              }
            />
            <Field label="Brand">
              <select
                className="input"
                value={form.brand || ""}
                onChange={(e) => set("brand", e.target.value)}
              >
                <option value="">Choose…</option>
                {(brands.data?.data || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={form.status}
                onChange={(e) => set("status", e.target.value as Form["status"])}
              >
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="removed">Removed</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Images */}
        <section className="card p-6 space-y-5">
          <div>
            <h3 className="font-semibold">Images</h3>
            <p className="text-xs text-neutral-500 mt-1">
              <span className="font-medium text-neutral-700">Thumbnail</span> — shown on product cards. &nbsp;
              <span className="font-medium text-violet-600">Hover</span> — optional, shown on hover.
              {mode === "new" && <span className="text-neutral-400"> Files will upload automatically when you create the product.</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <ImageSlot
              label="Thumbnail"
              url={thumbUrl}
              progress={prog["thumb"]}
              onSelect={onThumbSelect}
              onRemove={() => { set("thumbnail", undefined); setPendingThumb(null); setP("thumb", 0); }}
              badge="Thumbnail"
              badgeColor="neutral"
            />
            <ImageSlot
              label="Hover image"
              url={hoverUrl}
              progress={prog["hover"]}
              onSelect={onHoverSelect}
              onRemove={() => { set("hoverImage", undefined); setPendingHover(null); setP("hover", 0); }}
              badge="Hover"
              badgeColor="violet"
            />

            {/* Uploaded gallery */}
            {form.images.map((url) => (
              <ImageSlot
                key={url}
                label="Gallery"
                url={url}
                onSelect={() => {}}
                onRemove={() => set("images", form.images.filter((u) => u !== url))}
                badge="Gallery"
                badgeColor="neutral"
              />
            ))}

            {/* Pending gallery (new mode) */}
            {pendingGallery.map((p, i) => (
              <ImageSlot
                key={p.previewUrl}
                label="Gallery"
                url={p.previewUrl}
                progress={prog[`gallery-${i}`]}
                onSelect={() => {}}
                onRemove={() => setPendingGallery((prev) => prev.filter((_, idx) => idx !== i))}
                badge="Gallery"
                badgeColor="neutral"
              />
            ))}

            {/* Add gallery slot */}
            <ImageSlot
              label="Add gallery"
              url={undefined}
              onSelect={onGallerySelect}
              badge=""
              badgeColor="neutral"
              addMore
            />
          </div>
        </section>

        {/* Digital file */}
        <section className="card p-6 space-y-4">
          <div>
            <h3 className="font-semibold">Digital file</h3>
            <p className="text-xs text-neutral-500 mt-1">
              ZIP only · max 2 GB · file size calculated automatically.
              {mode === "new" && <span className="text-neutral-400"> Will upload after product is created.</span>}
            </p>
          </div>
          <ZipSlot
            pending={pendingZip}
            existingName={existing?.file?.b2FileName}
            existingSizeMb={form.fileSizeMb}
            progress={prog["zip"]}
            onSelect={onZipSelect}
            onRemovePending={() => { setPendingZip(null); setP("zip", 0); }}
          />
        </section>

        {/* Tags */}
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Tags</h3>
          <p className="text-xs text-neutral-500 -mt-2">Keywords for search. Press Enter or comma to add.</p>
          <TagInput tags={form.tags || []} onChange={(t) => set("tags", t)} />
        </section>

        {/* Pricing */}
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Pricing</h3>
          <p className="text-xs text-neutral-500 -mt-2">
            Enter in <span className="font-semibold text-neutral-700">Indian Rupees (₹ INR)</span>.
            International customers are charged the USD equivalent automatically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Field label="Base price (₹ INR)" error={errors.price}>
              <input
                type="number"
                className={`input ${errors.price ? "border-rose-500" : ""}`}
                value={form.price}
                min={0}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
              />
            </Field>
            <div className="pb-1">
              <span className="label">≈ USD equivalent</span>
              <div className="input bg-neutral-50 text-neutral-500 cursor-default select-none">
                {form.price === 0 ? "Free" : `$ ${(form.price * 0.012).toFixed(2)}`}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={form.price === 0}
                onChange={(e) => set("price", e.target.checked ? 0 : 100)}
              />
              Free download
            </label>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 items-center">
          <button
            onClick={save}
            disabled={busy || hasErrors}
            title={hasErrors ? "Fix the errors above before saving" : undefined}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "new" ? "Create product" : "Save changes"}
          </button>
          <Link href="/products" className="btn-outline">
            <X className="w-4 h-4 mr-1 inline" /> Cancel
          </Link>
          {hasErrors && (
            <span className="text-xs text-rose-600">Fix errors above before saving.</span>
          )}
        </div>
      </div>
    </>
  );
}

// ── ImageSlot ─────────────────────────────────────────────────────────────────

function ImageSlot({
  label,
  url,
  progress,
  onSelect,
  onRemove,
  badge,
  badgeColor,
  addMore,
}: {
  label: string;
  url?: string;
  progress?: number;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  badge: string;
  badgeColor: "neutral" | "violet";
  addMore?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = !!progress && progress > 0 && progress < 100;
  const badgeClass = badgeColor === "violet"
    ? "text-violet-600 bg-violet-50 border-violet-200"
    : "text-neutral-500 bg-neutral-50 border-neutral-200";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { onSelect(f); e.target.value = ""; } }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative w-28 h-28 rounded-xl overflow-hidden cursor-pointer transition-all
          ${url
            ? "border-2 border-neutral-200 hover:border-neutral-400"
            : addMore
              ? "border-2 border-dashed border-neutral-200 hover:border-neutral-400 bg-neutral-50"
              : "border-2 border-dashed border-neutral-300 hover:border-black bg-neutral-50 hover:bg-white"
          }`}
      >
        {url ? (
          <>
            <img src={url} alt="" className="w-full h-full object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                <span className="text-white text-sm font-semibold">{progress}%</span>
              </div>
            )}
            {!isUploading && !addMore && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1.5">
            <ImagePlus className={`w-5 h-5 ${badgeColor === "violet" ? "text-violet-400" : "text-neutral-400"}`} />
            <span className="text-[10px] text-center text-neutral-400 px-2 leading-tight">{label}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div className="w-28 h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${badgeColor === "violet" ? "bg-violet-500" : "bg-black"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Badge + actions */}
      {url && !isUploading && badge && (
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeClass}`}>
            {badge}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[10px] text-neutral-400 hover:text-rose-500 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {!url && badge && (
        <span className={`text-[10px] ${badgeColor === "violet" ? "text-violet-400" : "text-neutral-400"}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── ZipSlot ───────────────────────────────────────────────────────────────────

function ZipSlot({
  pending,
  existingName,
  existingSizeMb,
  progress,
  onSelect,
  onRemovePending,
}: {
  pending: File | null;
  existingName?: string;
  existingSizeMb?: number;
  progress?: number;
  onSelect: (file: File) => void;
  onRemovePending?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = !!progress && progress > 0 && progress < 100;
  const hasFile = !!pending || !!existingName;

  function localSizeMb(file: File) {
    return (file.size / 1024 / 1024).toFixed(1);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!f.name.toLowerCase().endsWith(".zip")) {
            toast.error("Only ZIP files are allowed");
            return;
          }
          onSelect(f);
          e.target.value = "";
        }}
      />

      {!hasFile ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
        >
          <FileArchive className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
          <div className="text-sm font-medium text-neutral-700">Click to select ZIP file</div>
          <div className="text-xs text-neutral-400 mt-1">ZIP only · max 2 GB</div>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FileArchive className={`w-9 h-9 shrink-0 mt-0.5 ${isUploading ? "text-neutral-400" : "text-emerald-600"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {pending ? pending.name : existingName}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {pending
                  ? `${localSizeMb(pending)} MB · queued for upload`
                  : existingSizeMb
                    ? `${existingSizeMb} MB · uploaded`
                    : "uploaded"}
              </div>

              {isUploading && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Uploading…</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {!isUploading && (
                <div className="flex items-center gap-2 mt-2">
                  {existingName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-xs text-neutral-500 hover:text-black border border-neutral-200 px-2 py-0.5 rounded"
                  >
                    Replace
                  </button>
                  {pending && onRemovePending && (
                    <button
                      type="button"
                      onClick={onRemovePending}
                      className="text-xs text-rose-500 hover:text-rose-700 border border-rose-100 px-2 py-0.5 rounded"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CategorySelector ──────────────────────────────────────────────────────────

function CategorySelector({
  allCats,
  categoryId,
  subCategoryId,
  error,
  onChangeCategory,
}: {
  allCats: ApiCategory[];
  categoryId: string;
  subCategoryId: string;
  error?: string | null;
  onChangeCategory: (directCatId: string, topLevelId: string) => void;
}) {
  const topCats = allCats.filter((c) => !c.parent);
  const directCat = allCats.find((c) => c.id === categoryId);
  const topCatId = directCat?.parent ? directCat.parent : categoryId;
  const selectedSubId = directCat?.parent ? categoryId : "";
  const subCats = allCats.filter((c) => c.parent === topCatId);

  return (
    <>
      <Field label="Category" required error={error}>
        <select
          className={`input ${error ? "border-rose-500" : ""}`}
          value={topCatId}
          onChange={(e) => onChangeCategory(e.target.value, "")}
        >
          <option value="">Choose…</option>
          {topCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      {topCatId && subCats.length > 0 && (
        <Field label="Subcategory">
          <select
            className="input"
            value={selectedSubId}
            onChange={(e) => {
              if (e.target.value) onChangeCategory(e.target.value, topCatId);
              else onChangeCategory(topCatId, "");
            }}
          >
            <option value="">— All —</option>
            {subCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}
    </>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </span>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </label>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const pieces = raw.split(",").map((s) => s.trim()).filter(Boolean);
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

  return (
    <div
      className="border border-neutral-300 rounded-md px-2 py-2 flex flex-wrap gap-2 focus-within:border-black cursor-text"
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-neutral-100 text-xs pl-2 pr-1 py-1 rounded-full"
        >
          <TagIcon className="w-3 h-3 text-neutral-500" />
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)); }}
            className="ml-0.5 text-neutral-500 hover:text-rose-600"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(draft); }
          else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => { if (draft) commit(draft); }}
        onPaste={(e) => {
          const t = e.clipboardData.getData("text");
          if (t.includes(",") || t.includes("\n")) { e.preventDefault(); commit(t.replace(/\n/g, ",")); }
        }}
        placeholder={tags.length === 0 ? "Modern, Minimalist, Wood…" : ""}
        maxLength={32}
        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent px-1"
      />
    </div>
  );
}
