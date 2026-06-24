"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { useCreateHeroSlide, apiError } from "@/lib/hooks";

export default function NewHeroSlidePage() {
  const router = useRouter();
  const [form, setForm] = useState<SlideFormData>(defaultSlideForm);
  const createM = useCreateHeroSlide();
  const busy = createM.isPending;

  const errors = useMemo(() => validateSlideForm(form), [form]);
  const hasErrors = Object.values(errors).some(Boolean);

  function patch(partial: Partial<SlideFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function save() {
    if (hasErrors || busy) return;
    try {
      const res = await createM.mutateAsync({
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
      toast.success("Slide created");
      const id = (res as { slide?: { id?: string } })?.slide?.id;
      if (id) router.push(`/hero/${id}/edit`);
      else router.push("/hero");
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

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title="New hero slide"
        actions={
          <Link href="/hero" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black ml-3">
            <ArrowLeft className="w-4 h-4" /> Back to slides
          </Link>
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
            />

            <div className="mt-6 flex gap-3 border-t border-neutral-100 pt-5">
              <button
                onClick={save}
                disabled={busy || hasErrors}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create slide"}
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
