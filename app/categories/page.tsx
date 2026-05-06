"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import Drawer from "@/components/Drawer";
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  apiError,
} from "@/lib/hooks";
import type { ApiCategory } from "@/lib/types";

export default function CategoriesPage() {
  const { data, isLoading } = useAdminCategories();
  const [editing, setEditing] = useState<ApiCategory | "new" | null>(null);
  const del = useDeleteCategory();

  const cats = data?.data || [];

  async function onDelete(c: ApiCategory) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await del.mutateAsync(c.id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <Topbar title="Categories" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${cats.length} categor${cats.length !== 1 ? "ies" : "y"}`}
          </p>
          <button className="btn-primary flex items-center gap-2" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cats.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-neutral-500 mt-1">/{c.slug}</div>
              <div className="text-xs text-neutral-400 mt-3">
                {c.productCount ?? 0} product{(c.productCount ?? 0) !== 1 ? "s" : ""}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(c)} className="text-xs underline flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => onDelete(c)} className="text-xs text-rose-600 underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CategoryDrawer
        open={!!editing}
        mode={editing === "new" ? "new" : "edit"}
        existing={editing === "new" || !editing ? undefined : editing}
        parents={cats.filter((c) => !c.parent)}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function CategoryDrawer({
  open,
  mode,
  existing,
  parents,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  existing?: ApiCategory;
  parents: ApiCategory[];
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [parent, setParent] = useState(existing?.parent || "");
  const createM = useCreateCategory();
  const updateM = useUpdateCategory(existing?.id || "");

  const nameError = !name.trim() ? "Name is required" : name.trim().length > 120 ? "Max 120 characters" : null;
  const hasErrors = !!nameError;

  async function save() {
    if (hasErrors) return;
    try {
      const body = { name: name.trim(), parent: parent || null };
      if (mode === "new") await createM.mutateAsync(body);
      else await updateM.mutateAsync(body);
      toast.success("Saved");
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <Drawer open={open} title={mode === "new" ? "New category" : "Edit category"} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="label">Name <span className="text-rose-600">*</span></span>
          <input
            className={`input ${nameError ? "border-rose-500" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
          />
          {nameError && <p className="text-xs text-rose-600 mt-1">{nameError}</p>}
        </label>

        <label className="block">
          <span className="label">Parent <span className="text-[10px] text-neutral-400 ml-1">optional</span></span>
          <select className="input" value={parent || ""} onChange={(e) => setParent(e.target.value)}>
            <option value="">— Top level —</option>
            {parents
              .filter((p) => p.id !== existing?.id)
              .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            {parent ? "This will be a sub-category (appears as a filter pill)." : "This will be a top-level collection (appears in the nav)."}
          </p>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            onClick={save}
            disabled={hasErrors || createM.isPending || updateM.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {createM.isPending || updateM.isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
        </div>
      </div>
    </Drawer>
  );
}
