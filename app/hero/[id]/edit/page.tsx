"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Topbar from "@/components/Topbar";
import HeroSlideForm, {
  SlideFormData,
  validateSlideForm,
  defaultSlideForm,
  DEFAULT_STYLES,
} from "@/components/hero/HeroSlideForm";
import HeroSlidePreview from "@/components/hero/HeroSlidePreview";
import { useAdminHeroSlide, useUpdateHeroSlide, apiError } from "@/lib/hooks";

export default function EditHeroSlidePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useAdminHeroSlide(id);
  const slide = data?.slide;

  const [form, setForm] = useState<SlideFormData>(defaultSlideForm);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (slide && !initialised) {
      setForm({
        img: slide.img || "",
        tag: slide.tag || "",
        title0: slide.title?.[0] || "",
        title1: slide.title?.[1] || "",
        sub: slide.sub || "",
        cta: slide.cta || "Explore",
        href: slide.href || "/",
        accent: slide.accent || "",
        active: slide.active ?? true,
        styles: { ...DEFAULT_STYLES, ...(slide.styles ?? {}) },
      });
      setInitialised(true);
    }
  }, [slide, initialised]);

  const updateM = useUpdateHeroSlide(id);
  const busy = updateM.isPending;

  const errors = useMemo(() => validateSlideForm(form), [form]);
  const hasErrors = Object.values(errors).some(Boolean);

  function patch(partial: Partial<SlideFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function save() {
    if (hasErrors || busy) return;
    try {
      await updateM.mutateAsync({
        img: form.img,
        tag: form.tag,
        title: [form.title0, form.title1],
        sub: form.sub,
        cta: form.cta,
        href: form.href,
        accent: form.accent,
        active: form.active,
        styles: form.styles,
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  const previewSlide = {
    img: form.img,
    tag: form.tag,
    title: [form.title0 || "Title line 1", form.title1 || "Title line 2"] as [string, string],
    sub: form.sub,
    cta: form.cta || "Explore",
    href: form.href,
    accent: form.accent,
    styles: form.styles,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar title="Edit hero slide" />
        <div className="flex-1 flex items-center justify-center text-neutral-400">Loading…</div>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar title="Edit hero slide" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-neutral-400">
          <p>Slide not found.</p>
          <Link href="/hero" className="btn-outline">Back to slides</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title="Edit hero slide"
        actions={
          <div className="flex items-center gap-3 ml-3">
            <Link href="/hero" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black">
              <ArrowLeft className="w-4 h-4" /> Back to slides
            </Link>
            <span className="text-neutral-200">|</span>
            <Link href={`/hero/${id}`} className="text-sm text-neutral-500 hover:text-black">
              View detail
            </Link>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Form ── */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto border-r border-neutral-200 bg-white">
          <div className="p-6">
            <HeroSlideForm
              form={form}
              errors={errors}
              onChange={patch}
              slideId={id}
            />

            <div className="mt-6 flex gap-3 border-t border-neutral-100 pt-5">
              <button
                onClick={save}
                disabled={busy || hasErrors}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <Link href="/hero" className="btn-outline flex-1 text-center">
                Cancel
              </Link>
            </div>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="flex-1 overflow-hidden bg-neutral-50 p-5 flex flex-col">
          <HeroSlidePreview slide={previewSlide} />
        </div>
      </div>
    </div>
  );
}
