"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { X, Tag as TagIcon } from "lucide-react";
import Topbar from "@/components/Topbar";
import RichEditor from "@/components/RichEditor";
import ImageUploader, { ImageChip } from "@/components/ImageUploader";
import ZipUploader from "@/components/ZipUploader";
import {
  useAdminBrands,
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
  apiError,
} from "@/lib/hooks";
import type { ApiProduct } from "@/lib/types";

type Form = {
  title: string;
  slug?: string;
  description: string;
  price: number;
  status: "draft" | "review" | "published" | "removed";
  brand?: string; // id
  category?: string; // id
  thumbnail?: string;
  hoverImage?: string;
  images: string[];
  fileSizeMb?: number;
  attributes: {
    material?: string;
    style?: string;
    color?: string;
    dimensions?: { w?: number; l?: number; h?: number };
  };
  tags?: string[];
};

function productToForm(p?: ApiProduct): Form {
  return {
    title: p?.title || "",
    slug: p?.slug,
    description: p?.description || "",
    price: p?.price ?? 0,
    status: (p?.status as Form["status"]) || "draft",
    brand: typeof p?.brand === "string" ? p?.brand : p?.brand?.id,
    category: typeof p?.category === "string" ? p?.category : p?.category?.id,
    thumbnail: p?.thumbnail,
    hoverImage: p?.hoverImage,
    images: p?.images || [],
    fileSizeMb: p?.fileSizeMb,
    attributes: p?.attributes || {},
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

  useEffect(() => {
    if (existing) setForm(productToForm(existing));
  }, [existing]);

  const brands = useAdminBrands();
  const cats = useAdminCategories();
  const createM = useCreateProduct();
  const updateM = useUpdateProduct(existing?.id || "");
  const busy = createM.isPending || updateM.isPending;

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const errors = useMemo<Record<string, string | null>>(() => ({
    title: !form.title.trim() ? "Title is required" : form.title.length > 160 ? "Max 160 characters" : null,
    category: !form.category ? "Category is required" : null,
    price: form.price < 0 ? "Price can't be negative" : form.price > 10_000_000 ? "Price too high" : null,
    fileSizeMb: form.fileSizeMb !== undefined && form.fileSizeMb < 0 ? "Must be ≥ 0" : null,
  }), [form.title, form.category, form.price, form.fileSizeMb]);
  const hasErrors = Object.values(errors).some(Boolean);

  async function save() {
    if (hasErrors) return;
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price) || 0,
      status: form.status,
      brand: form.brand,
      category: form.category,
      thumbnail: form.thumbnail,
      hoverImage: form.hoverImage,
      images: form.images,
      fileSizeMb: form.fileSizeMb,
      attributes: form.attributes,
      tags: form.tags,
    };
    try {
      if (mode === "new") {
        const res = await createM.mutateAsync(payload);
        toast.success("Product created");
        router.push(`/products/${res.product.id}`);
      } else {
        await updateM.mutateAsync(payload);
        toast.success("Saved");
      }
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <>
      <Topbar title={mode === "new" ? "New product" : `Edit: ${form.title || "…"}`} />
      <div className="p-6 space-y-6 max-w-[1100px]">
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Basic info</h3>
          <Field label="Title" required error={errors.title}>
            <input
              className={`input ${errors.title ? "border-rose-500" : ""}`}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Sofa Harlem"
              required
              maxLength={160}
            />
          </Field>
          {form.slug && (
            <Field label="Slug (auto-generated)">
              <input className="input" value={form.slug} readOnly disabled />
            </Field>
          )}
          <Field label="Description">
            <RichEditor value={form.description} onChange={(v: string) => set("description", v)} />
          </Field>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Organization</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Category" required error={errors.category}>
              <select
                className={`input ${errors.category ? "border-rose-500" : ""}`}
                value={form.category || ""}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Choose…</option>
                {(cats.data?.data || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
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
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="published">Published</option>
                <option value="removed">Removed</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Attributes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Material">
              <input className="input" value={form.attributes.material || ""} onChange={(e) => set("attributes", { ...form.attributes, material: e.target.value })} />
            </Field>
            <Field label="Style">
              <input className="input" value={form.attributes.style || ""} onChange={(e) => set("attributes", { ...form.attributes, style: e.target.value })} />
            </Field>
            <Field label="Color">
              <input className="input" value={form.attributes.color || ""} onChange={(e) => set("attributes", { ...form.attributes, color: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Width (cm)">
              <input type="number" className="input" value={form.attributes.dimensions?.w ?? ""} onChange={(e) => set("attributes", { ...form.attributes, dimensions: { ...(form.attributes.dimensions || {}), w: Number(e.target.value) } })} />
            </Field>
            <Field label="Length (cm)">
              <input type="number" className="input" value={form.attributes.dimensions?.l ?? ""} onChange={(e) => set("attributes", { ...form.attributes, dimensions: { ...(form.attributes.dimensions || {}), l: Number(e.target.value) } })} />
            </Field>
            <Field label="Height (cm)">
              <input type="number" className="input" value={form.attributes.dimensions?.h ?? ""} onChange={(e) => set("attributes", { ...form.attributes, dimensions: { ...(form.attributes.dimensions || {}), h: Number(e.target.value) } })} />
            </Field>
            <Field label="File size (Mb)">
              <input type="number" className="input" value={form.fileSizeMb ?? ""} onChange={(e) => set("fileSizeMb", Number(e.target.value) || undefined)} />
            </Field>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Images</h3>
          <div className="flex flex-wrap gap-3">
            {form.thumbnail && (
              <div>
                <ImageChip url={form.thumbnail} onRemove={() => set("thumbnail", undefined)} />
                <div className="text-[10px] text-neutral-500 mt-1 text-center">thumbnail</div>
              </div>
            )}
            {form.hoverImage && (
              <div>
                <ImageChip url={form.hoverImage} onRemove={() => set("hoverImage", undefined)} />
                <div className="text-[10px] text-violet-600 mt-1 text-center font-medium">hover</div>
              </div>
            )}
            {form.images.map((url) => (
              <ImageChip
                key={url}
                url={url}
                onRemove={() => set("images", form.images.filter((u) => u !== url))}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-500 -mt-2">
            <span className="font-medium text-neutral-700">Thumbnail</span> — shown by default on product cards.{" "}
            <span className="font-medium text-violet-700">Hover image</span> — shown when the user hovers over the card (optional).
          </p>
          <div className="flex flex-wrap gap-3">
            {mode === "edit" && existing ? (
              <>
                <ImageUploader
                  kind="product"
                  refId={existing.id}
                  role="thumbnail"
                  label="Upload thumbnail"
                  onUploaded={(url) => set("thumbnail", url)}
                />
                <ImageUploader
                  kind="product"
                  refId={existing.id}
                  role="hover"
                  label="Upload hover image"
                  onUploaded={(url) => set("hoverImage", url)}
                />
                <ImageUploader
                  kind="product"
                  refId={existing.id}
                  role="gallery"
                  label="Upload gallery image"
                  onUploaded={(url) => set("images", [...form.images, url])}
                />
              </>
            ) : (
              <p className="text-xs text-neutral-500">
                Save the product first, then come back to upload images.
              </p>
            )}
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Digital file</h3>
          {mode === "edit" && existing ? (
            <>
              {existing.file?.b2FileName && (
                <div className="text-xs text-neutral-500">
                  Current: <code className="bg-neutral-100 px-1.5 py-0.5 rounded">{existing.file.b2FileName}</code>
                </div>
              )}
              <ZipUploader productId={existing.id} onUploaded={({ sizeMb }) => set("fileSizeMb", sizeMb)} />
            </>
          ) : (
            <p className="text-xs text-neutral-500">
              Save the product first to get an ID, then upload the ZIP here.
            </p>
          )}
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Tags</h3>
          <p className="text-xs text-neutral-500 -mt-2">
            Keywords that help buyers find this product. Press Enter or comma to add.
          </p>
          <TagInput tags={form.tags || []} onChange={(t) => set("tags", t)} />
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Price (₹)" error={errors.price}>
              <input
                type="number"
                className={`input ${errors.price ? "border-rose-500" : ""}`}
                value={form.price}
                min={0}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm mt-7">
              <input type="checkbox" checked={form.price === 0} onChange={(e) => set("price", e.target.checked ? 0 : 100)} />
              Free download
            </label>
          </div>
        </section>

        <div className="flex gap-3">
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
            <span className="text-xs text-rose-600 self-center">Fields marked in red need your attention.</span>
          )}
        </div>
      </div>
    </>
  );
}

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

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const pieces = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (pieces.length === 0) return;
    const seen = new Set(tags.map((t) => t.toLowerCase()));
    const next = [...tags];
    for (const p of pieces) {
      if (p.length > 32) continue;
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        next.push(p);
      }
    }
    if (next.length !== tags.length) onChange(next.slice(0, 20));
    setDraft("");
  }

  function remove(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div
      className="border border-neutral-300 rounded-md px-2 py-2 flex flex-wrap gap-2 focus-within:border-black"
      onClick={(e) => {
        const input = (e.currentTarget as HTMLElement).querySelector("input");
        input?.focus();
      }}
    >
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 bg-neutral-100 text-xs pl-2 pr-1 py-1 rounded-full">
          <TagIcon className="w-3 h-3 text-neutral-500" />
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(t); }}
            className="ml-0.5 text-neutral-500 hover:text-rose-600"
            aria-label={`Remove tag ${t}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && tags.length > 0) {
            e.preventDefault();
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={() => { if (draft) commit(draft); }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes(",") || text.includes("\n")) {
            e.preventDefault();
            commit(text.replace(/\n/g, ","));
          }
        }}
        placeholder={tags.length === 0 ? "Modern, Minimalist, Wood…" : ""}
        maxLength={32}
        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent px-1"
      />
    </div>
  );
}
