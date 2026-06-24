"use client";

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
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, ExternalLink } from "lucide-react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { confirm } from "@/components/ConfirmDialog";
import {
  useAdminHeroSlides,
  useDeleteHeroSlide,
  useToggleHeroSlide,
  useReorderHeroSlides,
  apiError,
} from "@/lib/hooks";
import type { ApiHeroSlide } from "@/lib/types";

export default function HeroSlidesPage() {
  const { data, isLoading } = useAdminHeroSlides();
  const slides = data?.data || [];

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
          <Link href="/hero/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add slide
          </Link>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((s) => (
                <SlideRow
                  key={s.id}
                  slide={s}
                  onDelete={() => onDelete(s)}
                  onToggle={() => onToggle(s.id)}
                />
              ))}
              {!isLoading && slides.length === 0 && (
                <div className="card p-10 text-center text-sm text-neutral-400">
                  No slides yet.{" "}
                  <Link href="/hero/new" className="text-black underline">Add your first hero slide.</Link>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

function SlideRow({
  slide,
  onDelete,
  onToggle,
}: {
  slide: ApiHeroSlide;
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
      {slide.img && (
        <img src={slide.img} className="w-24 h-14 rounded object-cover flex-shrink-0" alt="" />
      )}
      <div className="flex-1 min-w-0">
        {slide.tag && <div className="text-[10px] tracking-widest uppercase text-neutral-400">{slide.tag}</div>}
        <div className="font-medium truncate">{slide.title?.[0]} {slide.title?.[1]}</div>
        {slide.sub && <div className="text-xs text-neutral-500 truncate">{slide.sub}</div>}
      </div>
      <span className={`text-xs rounded-full px-2.5 py-0.5 flex-shrink-0 ${slide.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
        {slide.active ? "Active" : "Hidden"}
      </span>

      <Link href={`/hero/${slide.id}`} className="p-1.5 hover:bg-neutral-100 rounded" title="View detail">
        <ExternalLink className="w-4 h-4 text-neutral-400" />
      </Link>
      <button onClick={onToggle} className="p-1.5 hover:bg-neutral-100 rounded" title={slide.active ? "Hide" : "Show"}>
        {slide.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <Link href={`/hero/${slide.id}/edit`} className="p-1.5 hover:bg-neutral-100 rounded" title="Edit">
        <Edit className="w-4 h-4" />
      </Link>
      <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
