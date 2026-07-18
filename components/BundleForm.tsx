"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Topbar from "@/components/Topbar";
import ImageUploader, { ImageChip } from "@/components/ImageUploader";
import {
  useAdminProducts,
  useCreateBundle,
  useUpdateBundle,
  apiError,
} from "@/lib/hooks";
import type { ApiBundle } from "@/lib/types";

type Form = {
  name: string;
  tag?: string;
  badge?: string;
  description?: string;
  image?: string;
  images: string[];
  productIds: string[];
  bundlePrice: number;
  status: "draft" | "published";
};

function toForm(b?: ApiBundle): Form {
  return {
    name: b?.name || "",
    tag: b?.tag,
    badge: b?.badge,
    description: b?.description,
    image: b?.image,
    images: b?.images || [],
    productIds: (b?.productIds || []).map((p) => (typeof p === "string" ? p : p.id)),
    bundlePrice: b?.bundlePrice ?? 0,
    status: (b?.status as Form["status"]) || "draft",
  };
}

export default function BundleForm({
  mode,
  existing,
}: {
  mode: "new" | "edit";
  existing?: ApiBundle;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(toForm(existing));

  useEffect(() => {
    if (existing) setForm(toForm(existing));
  }, [existing]);

  const products = useAdminProducts({ limit: 20000, status: "published" });
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("All");
  const [prodBrand, setProdBrand] = useState("All");
  const [prodPriceFilter, setProdPriceFilter] = useState("All");

  const categoriesList = useMemo(() => {
    if (!products.data) return [];
    const set = new Set<string>();
    products.data.data.forEach((p) => {
      const cat = typeof p.category === "string" ? p.category : p.category?.name;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [products.data]);

  const brandsList = useMemo(() => {
    if (!products.data) return [];
    const set = new Set<string>();
    products.data.data.forEach((p) => {
      const brand = typeof p.brand === "string" ? p.brand : p.brand?.name;
      if (brand) set.add(brand);
    });
    return Array.from(set).sort();
  }, [products.data]);

  const filteredProducts = useMemo(() => {
    if (!products.data) return [];
    return products.data.data.filter((p) => {
      const brandName = (typeof p.brand === "string" ? p.brand : p.brand?.name || "").toLowerCase();
      const catName = (typeof p.category === "string" ? p.category : p.category?.name || "").toLowerCase();
      const titleLower = p.title.toLowerCase();
      const searchLower = prodSearch.toLowerCase();

      const matchesSearch =
        !prodSearch ||
        titleLower.includes(searchLower) ||
        brandName.includes(searchLower) ||
        catName.includes(searchLower);

      const matchesCategory =
        prodCategory === "All" ||
        catName === prodCategory.toLowerCase();

      const matchesBrand =
        prodBrand === "All" ||
        brandName === prodBrand.toLowerCase();

      const matchesPrice =
        prodPriceFilter === "All" ||
        (prodPriceFilter === "Free" ? p.price === 0 : p.price > 0);

      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });
  }, [products.data, prodSearch, prodCategory, prodBrand, prodPriceFilter]);

  const createM = useCreateBundle();
  const updateM = useUpdateBundle(existing?.id || "");

  const original = useMemo(() => {
    if (!products.data) return 0;
    const map = new Map(products.data.data.map((p) => [p.id, p.price]));
    return form.productIds.reduce((s, id) => s + (map.get(id) || 0), 0);
  }, [form.productIds, products.data]);

  const savings = original > 0 ? Math.round(((original - form.bundlePrice) / original) * 100) : 0;

  const errors = useMemo<Record<string, string | null>>(() => ({
    name: !form.name.trim() ? "Name is required" : form.name.length > 160 ? "Max 160 characters" : null,
    products: form.productIds.length === 0 ? "Pick at least one product" : null,
    bundlePrice: form.bundlePrice < 0 ? "Price can't be negative" : form.bundlePrice > 10_000_000 ? "Price too high" : form.bundlePrice > original && original > 0 ? "Bundle price exceeds the sum of included products" : null,
  }), [form.name, form.productIds.length, form.bundlePrice, original]);
  const hasErrors = Object.values(errors).some(Boolean);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }));
  }

  async function save() {
    if (hasErrors) return;
    const payload = {
      name: form.name,
      tag: form.tag,
      badge: form.badge,
      description: form.description,
      image: form.image,
      images: form.images,
      productIds: form.productIds,
      bundlePrice: Number(form.bundlePrice) || 0,
      originalPrice: original,
      status: form.status,
    };
    try {
      if (mode === "new") {
        const res = await createM.mutateAsync(payload);
        toast.success("Bundle created");
        router.push(`/bundles/${res.bundle.id}`);
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
      <Topbar title={mode === "new" ? "New bundle" : `Edit: ${form.name || "…"}`} />
      <div className="p-6 space-y-6 max-w-[1100px]">
        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Bundle info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Name <span className="text-rose-600">*</span></span>
              <input
                className={`input ${errors.name ? "border-rose-500" : ""}`}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={160}
                required
              />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </label>
            <label className="block">
              <span className="label">Tag</span>
              <input className="input" placeholder="Most Popular" value={form.tag || ""} onChange={(e) => set("tag", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Badge (optional)</span>
              <input className="input" placeholder="Best Value" value={form.badge || ""} onChange={(e) => set("badge", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Status</span>
              <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="label">Description</span>
            <textarea
              className="input min-h-[100px]"
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Images</h3>
          <div className="flex flex-wrap gap-3">
            {form.image && (
              <div>
                <ImageChip url={form.image} onRemove={() => set("image", undefined)} />
                <div className="text-[10px] text-neutral-500 mt-1 text-center">cover</div>
              </div>
            )}
            {form.images.map((url) => (
              <ImageChip key={url} url={url} onRemove={() => set("images", form.images.filter((u) => u !== url))} />
            ))}
          </div>
          {mode === "edit" && existing ? (
            <div className="flex gap-3">
              <ImageUploader kind="bundle" refId={existing.id} role="thumbnail" label="Upload cover" onUploaded={(url) => set("image", url)} />
              <ImageUploader kind="bundle" refId={existing.id} role="gallery" label="Upload gallery image" onUploaded={(url) => set("images", [...form.images, url])} />
            </div>
          ) : (
            <p className="text-xs text-neutral-500">Save the bundle first, then come back to upload images.</p>
          )}
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Included products <span className="text-rose-600">*</span></h3>
          <div className={`text-xs ${errors.products ? "text-rose-600" : "text-neutral-500"}`}>
            {errors.products || `${form.productIds.length} selected · Original total ₹${original.toLocaleString("en-IN")} · Showing ${filteredProducts.length} of ${products.data?.data?.length || 0} products`}
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.2fr_1.2fr_1fr] gap-3">
            <input
              type="text"
              placeholder="Search products in list…"
              className="input text-xs py-1.5 px-3 w-full"
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
            />
            <select
              className="input text-xs py-1.5 px-3 w-full bg-white"
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              className="input text-xs py-1.5 px-3 w-full bg-white"
              value={prodBrand}
              onChange={(e) => setProdBrand(e.target.value)}
            >
              <option value="All">All Brands</option>
              {brandsList.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <select
              className="input text-xs py-1.5 px-3 w-full bg-white"
              value={prodPriceFilter}
              onChange={(e) => setProdPriceFilter(e.target.value)}
            >
              <option value="All">All Prices</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="max-h-[360px] overflow-y-auto border border-neutral-200 rounded">
            {filteredProducts.length === 0 && (
              <div className="p-6 text-center text-xs text-neutral-400">No products found</div>
            )}
            {filteredProducts.map((p) => {
              const checked = form.productIds.includes(p.id);
              const brand = typeof p.brand === "string" ? p.brand : p.brand?.name;
              const cat = typeof p.category === "string" ? p.category : p.category?.name;
              return (
                <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)} />
                  {p.thumbnail && <img src={p.thumbnail} className="w-8 h-8 rounded object-cover" alt={p.title} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{p.title}</div>
                    <div className="text-xs text-neutral-400">{brand} · {cat}</div>
                  </div>
                  <div className="text-xs text-neutral-500">₹{p.price.toLocaleString("en-IN")}</div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="block">
              <span className="label">Bundle price (₹) <span className="text-rose-600">*</span></span>
              <input
                type="number"
                className={`input ${errors.bundlePrice ? "border-rose-500" : ""}`}
                value={form.bundlePrice}
                min={0}
                onChange={(e) => set("bundlePrice", Number(e.target.value) || 0)}
              />
              {errors.bundlePrice && <p className="text-xs text-rose-600 mt-1">{errors.bundlePrice}</p>}
            </label>
            <div className="text-sm">
              <div className="text-xs text-neutral-500">Original total</div>
              <div className="font-semibold">₹{original.toLocaleString("en-IN")}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-neutral-500">Customer saves</div>
              <div className="font-semibold text-emerald-600">{savings}%</div>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={createM.isPending || updateM.isPending || hasErrors}
            title={hasErrors ? "Fix errors before saving" : undefined}
            className="btn-primary disabled:opacity-50"
          >
            {createM.isPending || updateM.isPending ? "Saving…" : mode === "new" ? "Create bundle" : "Save changes"}
          </button>
          <Link href="/bundles" className="btn-outline">
            <X className="w-4 h-4 mr-1 inline" /> Cancel
          </Link>
          {hasErrors && (
            <span className="text-xs text-rose-600 self-center">Fix the highlighted fields to continue.</span>
          )}
        </div>
      </div>
    </>
  );
}
