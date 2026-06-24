"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import Topbar from "@/components/Topbar";
import HeroSlidePreview from "@/components/hero/HeroSlidePreview";
import { confirm } from "@/components/ConfirmDialog";
import {
  useAdminHeroSlide,
  useDeleteHeroSlide,
  useToggleHeroSlide,
  apiError,
} from "@/lib/hooks";

export default function HeroSlideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useAdminHeroSlide(id);
  const slide = data?.slide;

  const delM = useDeleteHeroSlide();
  const toggleM = useToggleHeroSlide();

  async function onDelete() {
    const ok = await confirm({
      title: "Delete this slide?",
      message: "The slide will be removed from the homepage carousel.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await delM.mutateAsync(id);
      toast.success("Deleted");
      router.push("/hero");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function onToggle() {
    try {
      await toggleM.mutateAsync(id);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar title="Hero slide" />
        <div className="flex-1 flex items-center justify-center text-neutral-400">Loading…</div>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar title="Hero slide" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-neutral-400">
          <p>Slide not found.</p>
          <Link href="/hero" className="btn-outline">Back to slides</Link>
        </div>
      </div>
    );
  }

  const previewSlide = {
    img: slide.img,
    tag: slide.tag || "",
    title: (slide.title || ["", ""]) as [string, string],
    sub: slide.sub || "",
    cta: slide.cta || "Explore",
    styles: slide.styles,
    href: slide.href || "/",
    accent: slide.accent || "",
  };

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title="Hero slide"
        actions={
          <Link href="/hero" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black ml-3">
            <ArrowLeft className="w-4 h-4" /> Back to slides
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Metadata panel ── */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
          <div className="p-6 space-y-5">

            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span className={`text-xs rounded-full px-3 py-1 font-medium ${slide.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                {slide.active ? "Active" : "Hidden"}
              </span>
              <span className="text-xs text-neutral-400">Order #{slide.order + 1}</span>
            </div>

            {/* Fields */}
            <Field label="Tag" value={slide.tag} />
            <Field label="Title line 1" value={slide.title?.[0]} />
            <Field label="Title line 2" value={slide.title?.[1]} />
            <Field label="Subtitle" value={slide.sub} />
            <Field label="CTA button" value={slide.cta} />
            <Field label="CTA link" value={slide.href} mono />
            <Field label="Accent text" value={slide.accent} />
            <Field label="Image URL" value={slide.img} mono truncate />

            {/* Action buttons */}
            <div className="border-t border-neutral-100 pt-5 space-y-2">
              <Link
                href={`/hero/${id}/edit`}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" /> Edit slide
              </Link>
              <button
                onClick={onToggle}
                disabled={toggleM.isPending}
                className="btn-outline w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {slide.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {slide.active ? "Hide from homepage" : "Show on homepage"}
              </button>
              <button
                onClick={onDelete}
                disabled={delM.isPending}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 text-sm transition-colors rounded disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete slide
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="flex-1 overflow-hidden bg-neutral-50 p-5 flex flex-col">
          <HeroSlidePreview slide={previewSlide} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-neutral-400 mb-0.5">{label}</dt>
      <dd className={`text-sm text-neutral-800 ${mono ? "font-mono text-xs" : ""} ${truncate ? "truncate" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
