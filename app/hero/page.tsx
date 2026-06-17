"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import Topbar from "@/components/Topbar";
import Drawer from "@/components/Drawer";
import ImageUploader from "@/components/ImageUploader";
import { confirm } from "@/components/ConfirmDialog";
import {
  useAdminHeroSlides,
  useCreateHeroSlide,
  useUpdateHeroSlide,
  useDeleteHeroSlide,
  useToggleHeroSlide,
  useReorderHeroSlides,
  apiError,
} from "@/lib/hooks";
import type { ApiHeroSlide } from "@/lib/types";

export default function HeroSlidesPage() {
  const { data, isLoading } = useAdminHeroSlides();
  const slides = data?.data || [];
  const [editing, setEditing] = useState<ApiHeroSlide | "new" | null>(null);

  const toggleM = useToggleHeroSlide();
  const delM = useDeleteHeroSlide();
  const reorderM = useReorderHeroSlides();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function onDelete(s: ApiHeroSlide) {
    const ok = await confirm({
      title: "Delete this slide?",
      message: "The slide will be removed from the homepage carousel.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await delM.mutateAsync(s.id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onToggle(id: string) {
    try {
      await toggleM.mutateAsync(id);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(slides, oldIndex, newIndex);
    try {
      await reorderM.mutateAsync(reordered.map((s) => s.id));
    } catch (err) {
      toast.error(apiError(err, "Reorder failed"));
    }
  }

  const activeCount = slides.filter((s) => s.active).length;

  return (
    <>
      <Topbar title="Hero slides" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${activeCount} active · ${slides.length} total`}
          </p>
          <button className="btn-primary flex items-center gap-2" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" /> Add slide
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((s) => (
                <SlideRow
                  key={s.id}
                  slide={s}
                  onEdit={() => setEditing(s)}
                  onDelete={() => onDelete(s)}
                  onToggle={() => onToggle(s.id)}
                />
              ))}
              {!isLoading && slides.length === 0 && (
                <div className="card p-10 text-center text-sm text-neutral-400">
                  No slides yet. Add your first hero slide.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <SlideDrawer
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={!!editing}
        mode={editing === "new" ? "new" : "edit"}
        existing={editing === "new" || !editing ? undefined : editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function SlideRow({
  slide,
  onEdit,
  onDelete,
  onToggle,
}: {
  slide: ApiHeroSlide;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1 }}
      className="card p-4 flex items-center gap-4"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-neutral-400 active:cursor-grabbing">
        <GripVertical className="w-5 h-5" />
      </button>
      {slide.img && <img src={slide.img} className="w-24 h-14 rounded object-cover" alt="" />}
      <div className="flex-1 min-w-0">
        {slide.tag && <div className="text-[10px] tracking-widest uppercase text-neutral-400">{slide.tag}</div>}
        <div className="font-medium truncate">{slide.title?.[0]} {slide.title?.[1]}</div>
        {slide.sub && <div className="text-xs text-neutral-500 truncate">{slide.sub}</div>}
      </div>
      <span className={`text-xs rounded-full px-2.5 py-0.5 ${slide.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
        {slide.active ? "Active" : "Hidden"}
      </span>
      <button onClick={onToggle} className="p-1.5 hover:bg-neutral-100 rounded" title={slide.active ? "Hide" : "Show"}>
        {slide.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button onClick={onEdit} className="p-1.5 hover:bg-neutral-100 rounded"><Edit className="w-4 h-4" /></button>
      <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

function SlideDrawer({
  open,
  mode,
  existing,
  onClose,
}: {
  open: boolean;
  mode: "new" | "edit";
  existing?: ApiHeroSlide;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    img: existing?.img || "",
    tag: existing?.tag || "",
    title0: existing?.title?.[0] || "",
    title1: existing?.title?.[1] || "",
    sub: existing?.sub || "",
    cta: existing?.cta || "Explore",
    href: existing?.href || "/",
    accent: existing?.accent || "",
    active: existing?.active ?? true,
  });
  const createM = useCreateHeroSlide();
  const updateM = useUpdateHeroSlide(existing?.id || "");
  const busy = createM.isPending || updateM.isPending;

  const isUrlish = (v: string) => /^https?:\/\/[^\s]+$/i.test(v) || v.startsWith("/");
  const errors = {
    img: !form.img ? "Background image is required" : !isUrlish(form.img) ? "Must be a URL or path starting with /" : null,
    title0: !form.title0.trim() ? "Title line 1 is required" : null,
    title1: !form.title1.trim() ? "Title line 2 is required" : null,
    href: form.href && !(form.href.startsWith("/") || isUrlish(form.href)) ? "Link must start with / or http(s)://" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function save() {
    if (hasErrors) return;
    const body = {
      img: form.img,
      tag: form.tag,
      title: [form.title0, form.title1] as [string, string],
      sub: form.sub,
      cta: form.cta,
      href: form.href,
      accent: form.accent,
      active: form.active,
    };
    try {
      if (mode === "new") await createM.mutateAsync(body);
      else await updateM.mutateAsync(body);
      toast.success("Saved");
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <Drawer open={open} title={mode === "new" ? "New hero slide" : "Edit hero slide"} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="label">Background image URL <span className="text-rose-600">*</span></span>
          <input
            className={`input ${errors.img ? "border-rose-500" : ""}`}
            value={form.img}
            onChange={(e) => setForm({ ...form, img: e.target.value })}
            placeholder="https://..."
          />
          {errors.img && <p className="text-xs text-rose-600 mt-1">{errors.img}</p>}
        </label>

        {existing && (
          <ImageUploader
            kind="hero"
            refId={existing.id}
            label="Upload background image"
            onUploaded={(url) => setForm({ ...form, img: url })}
          />
        )}

        <label className="block">
          <span className="label">Tag</span>
          <input className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Title line 1 <span className="text-rose-600">*</span></span>
            <input
              className={`input ${errors.title0 ? "border-rose-500" : ""}`}
              value={form.title0}
              onChange={(e) => setForm({ ...form, title0: e.target.value })}
            />
            {errors.title0 && <p className="text-xs text-rose-600 mt-1">{errors.title0}</p>}
          </label>
          <label className="block">
            <span className="label">Title line 2 <span className="text-rose-600">*</span></span>
            <input
              className={`input ${errors.title1 ? "border-rose-500" : ""}`}
              value={form.title1}
              onChange={(e) => setForm({ ...form, title1: e.target.value })}
            />
            {errors.title1 && <p className="text-xs text-rose-600 mt-1">{errors.title1}</p>}
          </label>
        </div>

        <label className="block">
          <span className="label">Subtitle</span>
          <textarea className="input" value={form.sub} onChange={(e) => setForm({ ...form, sub: e.target.value })} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">CTA text</span>
            <input className="input" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">CTA link</span>
            <input
              className={`input ${errors.href ? "border-rose-500" : ""}`}
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              placeholder="/c/models or https://…"
            />
            {errors.href && <p className="text-xs text-rose-600 mt-1">{errors.href}</p>}
          </label>
        </div>

        <label className="block">
          <span className="label">Accent text</span>
          <input className="input" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Visible on homepage
        </label>

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
