"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder, FolderPlus } from "lucide-react";
import Topbar from "@/components/Topbar";
import Drawer from "@/components/Drawer";
import { confirm } from "@/components/ConfirmDialog";
import ImageUploader from "@/components/ImageUploader";
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  usePatchCategory,
  apiError,
} from "@/lib/hooks";
import type { ApiCategory } from "@/lib/types";

type TreeNode = ApiCategory & { children: ApiCategory[] };

/** What the drawer is currently doing. */
type DrawerState =
  | { mode: "new-top" }
  | { mode: "new-sub"; parentId: string; parentName: string }
  | { mode: "edit"; cat: ApiCategory };

export default function CategoriesPage() {
  const { data, isLoading } = useAdminCategories();
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const del = useDeleteCategory();
  const patch = usePatchCategory();

  const cats = data?.data || [];

  const tree = useMemo<TreeNode[]>(() => {
    const topLevel = cats.filter((c) => !c.parent);
    return topLevel.map((top) => ({
      ...top,
      children: cats.filter((c) => c.parent === top.id),
    }));
  }, [cats]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onToggleStatus(c: ApiCategory) {
    try {
      await patch.mutateAsync({ id: c.id, status: c.status === "active" ? "hidden" : "active" });
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onDelete(c: ApiCategory) {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      message: "Remove all products and subcategories first. This cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await del.mutateAsync(c.id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const drawerKey =
    drawer === null
      ? "closed"
      : drawer.mode === "new-top"
        ? "new-top"
        : drawer.mode === "new-sub"
          ? `new-sub:${drawer.parentId}`
          : `edit:${drawer.cat.id}`;

  return (
    <>
      <Topbar title="Categories" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${cats.length} categor${cats.length !== 1 ? "ies" : "y"}`}
          </p>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setDrawer({ mode: "new-top" })}
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {isLoading && (
            <div className="p-8 text-center text-sm text-neutral-400">Loading…</div>
          )}
          {!isLoading && tree.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-400">No categories yet.</div>
          )}

          {tree.map((top, idx) => (
            <div key={top.id} className={idx > 0 ? "border-t border-neutral-200" : ""}>
              {/* Top-level row */}
              <CategoryRow
                cat={top}
                level={0}
                hasChildren={top.children.length > 0}
                expanded={expanded.has(top.id)}
                onToggleExpand={() => toggleExpand(top.id)}
                onEdit={() => setDrawer({ mode: "edit", cat: top })}
                onDelete={() => onDelete(top)}
                onToggleStatus={() => onToggleStatus(top)}
                onAddSub={() => {
                  setExpanded((prev) => new Set([...prev, top.id]));
                  setDrawer({ mode: "new-sub", parentId: top.id, parentName: top.name });
                }}
              />

              {/* Children */}
              {expanded.has(top.id) && (
                <div className="bg-neutral-50/40">
                  {top.children.map((child) => (
                    <div key={child.id} className="border-t border-neutral-100">
                      <CategoryRow
                        cat={child}
                        level={1}
                        hasChildren={false}
                        expanded={false}
                        onToggleExpand={() => {}}
                        onEdit={() => setDrawer({ mode: "edit", cat: child })}
                        onDelete={() => onDelete(child)}
                        onToggleStatus={() => onToggleStatus(child)}
                      />
                    </div>
                  ))}

                  {/* Add subcategory row */}
                  <div className="border-t border-neutral-100 px-4 py-2 pl-12">
                    <button
                      type="button"
                      onClick={() =>
                        setDrawer({ mode: "new-sub", parentId: top.id, parentName: top.name })
                      }
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-black transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add subcategory under {top.name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <CategoryDrawer
        key={drawerKey}
        open={!!drawer}
        state={drawer}
        allTopCats={cats.filter((c) => !c.parent)}
        onClose={() => setDrawer(null)}
      />
    </>
  );
}

function CategoryRow({
  cat,
  level,
  hasChildren,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddSub,
}: {
  cat: ApiCategory;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onAddSub?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/80 group transition-colors ${
        level === 1 ? "pl-12" : ""
      }`}
    >
      {/* Expand toggle */}
      <button
        type="button"
        className={`w-5 h-5 flex items-center justify-center text-neutral-400 shrink-0 ${
          !hasChildren ? "invisible" : "hover:text-neutral-700"
        }`}
        onClick={onToggleExpand}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Thumbnail */}
      {cat.image ? (
        <img
          src={cat.image}
          alt=""
          className="w-9 h-9 rounded object-cover border border-neutral-200 shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center shrink-0">
          {level === 0 ? (
            <FolderOpen className="w-4 h-4 text-neutral-400" />
          ) : (
            <Folder className="w-4 h-4 text-neutral-300" />
          )}
        </div>
      )}

      {/* Name & slug */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{cat.name}</div>
        <div className="text-xs text-neutral-400 truncate">/{cat.slug}</div>
      </div>

      {/* Product count */}
      <span className="text-xs text-neutral-400 hidden sm:block w-24 text-right shrink-0">
        {cat.productCount ?? 0} product{(cat.productCount ?? 0) !== 1 ? "s" : ""}
      </span>

      {/* Status toggle */}
      <button
        type="button"
        onClick={onToggleStatus}
        title="Click to toggle"
        className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
          cat.status === "active"
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
        }`}
      >
        {cat.status === "active" ? "Active" : "Hidden"}
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAddSub && (
          <button
            type="button"
            onClick={onAddSub}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500"
            title="Add subcategory"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-600"
          title="Edit"
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function CategoryDrawer({
  open,
  state,
  allTopCats,
  onClose,
}: {
  open: boolean;
  state: DrawerState | null;
  allTopCats: ApiCategory[];
  onClose: () => void;
}) {
  const isEdit = state?.mode === "edit";
  const existing = isEdit ? state.cat : undefined;

  const [name, setName] = useState(existing?.name || "");
  const [image, setImage] = useState(existing?.image || "");
  const [order, setOrder] = useState(existing?.order ?? 0);
  const [status, setStatus] = useState<"active" | "hidden">(existing?.status ?? "active");

  const createM = useCreateCategory();
  const updateM = useUpdateCategory(existing?.id || "");

  const nameError =
    !name.trim() ? "Name is required" : name.trim().length > 120 ? "Max 120 characters" : null;

  const drawerTitle =
    state?.mode === "new-top"
      ? "New category"
      : state?.mode === "new-sub"
        ? `New subcategory under ${state.parentName}`
        : "Edit category";

  async function save() {
    if (nameError) return;
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        order,
        status,
      };

      // Only include image if there's a value (avoid sending null to a strict validator)
      if (image) body.image = image;

      if (state?.mode === "new-sub") {
        body.parent = state.parentId;
      } else if (state?.mode === "edit" && existing?.parent) {
        body.parent = existing.parent;
      } else if (state?.mode === "edit") {
        body.parent = null;
      }
      // new-top: no parent field needed (defaults to null)

      if (state?.mode === "new-top" || state?.mode === "new-sub") {
        await createM.mutateAsync(body as Parameters<typeof createM.mutateAsync>[0]);
      } else {
        await updateM.mutateAsync(body as Parameters<typeof updateM.mutateAsync>[0]);
      }
      toast.success("Saved");
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <Drawer open={open} title={drawerTitle} onClose={onClose}>
      <div className="space-y-5">

        {/* Context label for subcategory */}
        {state?.mode === "new-sub" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600">
            <Folder className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            Parent: <span className="font-medium text-neutral-800">{state.parentName}</span>
          </div>
        )}

        {/* Name */}
        <label className="block">
          <span className="label">
            Name <span className="text-rose-600">*</span>
          </span>
          <input
            className={`input ${nameError ? "border-rose-500" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
            placeholder={state?.mode === "new-sub" ? "e.g. Sofas, Chairs…" : "e.g. 3D Models, Scenes…"}
          />
          {nameError && <p className="text-xs text-rose-600 mt-1">{nameError}</p>}
        </label>

        {/* Slug (read-only on edit) */}
        {isEdit && existing?.slug && (
          <div>
            <span className="label">Slug</span>
            <div className="input bg-neutral-50 text-neutral-500 text-sm">/{existing.slug}</div>
          </div>
        )}

        {/* Image */}
        <div>
          <span className="label">
            Image <span className="text-[10px] text-neutral-400 ml-1">optional</span>
          </span>
          <div className="flex items-start gap-3 mt-1.5">
            {image && (
              <div className="relative shrink-0">
                <img
                  src={image}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neutral-800 text-white rounded-full flex items-center justify-center text-xs leading-none"
                >
                  ×
                </button>
              </div>
            )}
            <ImageUploader
              kind="category"
              refId={existing?.id}
              onUploaded={(url) => setImage(url)}
              label={image ? "Replace image" : "Upload image"}
            />
          </div>
        </div>

        {/* Order */}
        <label className="block">
          <span className="label">Display order</span>
          <input
            type="number"
            className="input"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            min={0}
            max={9999}
          />
          <p className="text-xs text-neutral-500 mt-1">Lower number = appears earlier.</p>
        </label>

        {/* Status */}
        <div>
          <span className="label">Status</span>
          <div className="flex gap-2 mt-1.5">
            {(["active", "hidden"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                  status === s
                    ? s === "active"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-neutral-100 border-neutral-300 text-neutral-600"
                    : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
                }`}
              >
                {s === "active" ? "Active" : "Hidden"}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Hidden {state?.mode === "new-sub" || (isEdit && existing?.parent) ? "subcategories are" : "categories are"} invisible to shoppers.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={!!nameError || createM.isPending || updateM.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {createM.isPending || updateM.isPending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
        </div>
      </div>
    </Drawer>
  );
}
