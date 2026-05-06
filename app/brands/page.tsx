"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import Topbar from "@/components/Topbar";
import Drawer from "@/components/Drawer";
import ImageUploader from "@/components/ImageUploader";
import {
  useAdminBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  apiError,
} from "@/lib/hooks";
import type { ApiBrand } from "@/lib/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_RE = /^[A-Z]{2}$/;

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BrandsPage() {
  const { data, isLoading } = useAdminBrands();
  const [editing, setEditing] = useState<ApiBrand | "new" | null>(null);
  const [q, setQ] = useState("");
  const del = useDeleteBrand();

  const brands = data?.data || [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(needle) || b.slug.toLowerCase().includes(needle));
  }, [brands, q]);

  async function onDelete(b: ApiBrand) {
    if (!confirm(`Delete "${b.name}"? Products that reference this brand will still exist but lose the reference.`)) return;
    try {
      await del.mutateAsync(b.id);
      toast.success("Brand deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <Topbar title="Brands" />
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${filtered.length} of ${brands.length} brand${brands.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                className="input pl-8 max-w-[240px]"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setEditing("new")}>
              <Plus className="w-4 h-4" /> Add brand
            </button>
          </div>
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="card p-10 text-center text-sm text-neutral-400">
            {q ? "No brands match your search." : "No brands yet — click Add brand."}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="card p-5 flex flex-col">
              {b.logo ? (
                <img src={b.logo} alt={b.name} className="w-full h-20 object-contain mb-3" />
              ) : (
                <div className="w-full h-20 bg-neutral-50 rounded mb-3 flex items-center justify-center text-xs text-neutral-400">
                  no logo
                </div>
              )}
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-neutral-500 mt-1">/{b.slug}{b.country ? ` · ${b.country}` : ""}</div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(b)} className="text-xs underline flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => onDelete(b)} className="text-xs text-rose-600 underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BrandDrawer
        open={!!editing}
        mode={editing === "new" ? "new" : "edit"}
        existing={editing === "new" || !editing ? undefined : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function BrandDrawer({
  open,
  mode,
  existing,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  existing?: ApiBrand;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name || "",
    slug: existing?.slug || "",
    country: existing?.country || "",
    logo: existing?.logo || "",
    status: existing?.status || "active",
    slugEdited: !!existing,
  });

  const createM = useCreateBrand();
  const updateM = useUpdateBrand(existing?.id || "");
  const busy = createM.isPending || updateM.isPending;

  const errors: Record<string, string | null> = {
    name: !form.name.trim() ? "Name is required" : null,
    slug: !form.slug.trim()
      ? "Slug is required"
      : !SLUG_RE.test(form.slug)
        ? "Slug must be lowercase letters, numbers, and hyphens"
        : null,
    country: form.country && !COUNTRY_RE.test(form.country) ? "Country must be a 2-letter uppercase code (e.g. IN)" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function save() {
    try {
      const body: Partial<ApiBrand> = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        country: form.country.trim() || undefined,
        logo: form.logo || undefined,
        status: form.status as "active" | "hidden",
      };
      if (mode === "new") await createM.mutateAsync(body);
      else await updateM.mutateAsync(body);
      toast.success(mode === "new" ? "Brand created" : "Brand updated");
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <Drawer open={open} title={mode === "new" ? "New brand" : `Edit: ${existing?.name}`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="label">Name <span className="text-rose-600">*</span></span>
          <input
            className={`input ${errors.name ? "border-rose-500" : ""}`}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: f.slugEdited ? f.slug : slugify(name) }));
            }}
            autoFocus
          />
          {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
        </label>

        <label className="block">
          <span className="label">Slug <span className="text-rose-600">*</span></span>
          <input
            className={`input ${errors.slug ? "border-rose-500" : ""}`}
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugEdited: true }))}
            placeholder="brand-name"
          />
          {errors.slug ? (
            <p className="text-xs text-rose-600 mt-1">{errors.slug}</p>
          ) : (
            <p className="text-xs text-neutral-500 mt-1">Used in <code className="bg-neutral-100 px-1">/brands/&lt;slug&gt;</code>. Auto-filled from name.</p>
          )}
        </label>

        <label className="block">
          <span className="label">Country <span className="text-[10px] text-neutral-400 ml-1">optional</span></span>
          <input
            className={`input ${errors.country ? "border-rose-500" : ""}`}
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
            maxLength={2}
            placeholder="IN"
          />
          {errors.country && <p className="text-xs text-rose-600 mt-1">{errors.country}</p>}
        </label>

        <label className="block">
          <span className="label">Status</span>
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "hidden" }))}
          >
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>

        <div>
          <span className="label">Logo</span>
          {form.logo && (
            <div className="flex items-center gap-3 mt-2 mb-3">
              <img src={form.logo} alt="" className="w-20 h-20 object-contain border border-neutral-200 rounded" />
              <button onClick={() => setForm((f) => ({ ...f, logo: "" }))} className="text-xs text-rose-600 underline">Remove</button>
            </div>
          )}
          <ImageUploader kind="brand" label={form.logo ? "Replace logo" : "Upload logo"} onUploaded={(url) => setForm((f) => ({ ...f, logo: url }))} />
          <p className="text-xs text-neutral-500 mt-1">PNG/JPEG/WebP up to 10 MB.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={busy || hasErrors}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        </div>
      </div>
    </Drawer>
  );
}
