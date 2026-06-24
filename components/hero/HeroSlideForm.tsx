"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

export type SlideStyles = {
  tagSize: number;
  titleSize: number;
  subSize: number;
  ctaSize: number;
  accentSize: number;
};

export type SlideFormData = {
  img: string;
  tag: string;
  title0: string;
  title1: string;
  sub: string;
  cta: string;
  href: string;
  accent: string;
  active: boolean;
  styles: SlideStyles;
};

export type SlideFormErrors = {
  img: string | null;
  title0: string | null;
  title1: string | null;
  href: string | null;
};

export const DEFAULT_STYLES: SlideStyles = {
  tagSize: 10,
  titleSize: 5,
  subSize: 14,
  ctaSize: 11,
  accentSize: 10,
};

export function validateSlideForm(form: SlideFormData): SlideFormErrors {
  const isUrlish = (v: string) => /^https?:\/\/[^\s]+$/i.test(v) || v.startsWith("/");
  return {
    img: !form.img
      ? "Background image is required"
      : !isUrlish(form.img)
      ? "Must be a URL or path starting with /"
      : null,
    title0: !form.title0.trim() ? "Title line 1 is required" : null,
    title1: !form.title1.trim() ? "Title line 2 is required" : null,
    href:
      form.href && !(form.href.startsWith("/") || isUrlish(form.href))
        ? "Link must start with / or http(s)://"
        : null,
  };
}

export const defaultSlideForm = (): SlideFormData => ({
  img: "",
  tag: "",
  title0: "",
  title1: "",
  sub: "",
  cta: "Explore",
  href: "/",
  accent: "",
  active: true,
  styles: { ...DEFAULT_STYLES },
});

export default function HeroSlideForm({
  form,
  errors,
  onChange,
  slideId,
}: {
  form: SlideFormData;
  errors: SlideFormErrors;
  onChange: (patch: Partial<SlideFormData>) => void;
  slideId?: string;
}) {
  const [stylesOpen, setStylesOpen] = useState(false);

  const styles = form.styles ?? DEFAULT_STYLES;

  function patchStyles(patch: Partial<SlideStyles>) {
    onChange({ styles: { ...styles, ...patch } });
  }

  return (
    <div className="space-y-5">

      {/* ── Background image ── */}
      <div>
        <label className="label block mb-1">
          Background image URL <span className="text-rose-600">*</span>
        </label>
        <input
          className={`input ${errors.img ? "border-rose-500" : ""}`}
          value={form.img}
          onChange={(e) => onChange({ img: e.target.value })}
          placeholder="https://..."
        />
        {errors.img && <p className="text-xs text-rose-600 mt-1">{errors.img}</p>}

        {/* Always-available uploader */}
        <div className="mt-2">
          <ImageUploader
            kind="hero"
            refId={slideId}
            label="Upload from device"
            onUploaded={(url) => onChange({ img: url })}
          />
        </div>
      </div>

      {/* Image thumbnail preview */}
      {form.img && (
        <div className="rounded overflow-hidden border border-neutral-200 h-28 w-full relative">
          <img src={form.img} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
          <span className="absolute bottom-1.5 right-2 text-[9px] text-white/70 uppercase tracking-widest">
            Image preview
          </span>
        </div>
      )}

      {/* ── Tag ── */}
      <label className="block">
        <span className="label">Tag / Collection label</span>
        <input
          className="input"
          value={form.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
          placeholder="Spring Collection — 2026"
        />
      </label>

      {/* ── Titles ── */}
      <div className="space-y-4">
        <label className="block">
          <span className="label">
            Title line 1 <span className="text-rose-600">*</span>
          </span>
          <input
            className={`input ${errors.title0 ? "border-rose-500" : ""}`}
            value={form.title0}
            onChange={(e) => onChange({ title0: e.target.value })}
            placeholder="Where Craft"
          />
          {errors.title0 && <p className="text-xs text-rose-600 mt-1">{errors.title0}</p>}
        </label>
        <label className="block">
          <span className="label">
            Title line 2 <span className="text-rose-600">*</span>
          </span>
          <input
            className={`input ${errors.title1 ? "border-rose-500" : ""}`}
            value={form.title1}
            onChange={(e) => onChange({ title1: e.target.value })}
            placeholder="Meets Precision"
          />
          {errors.title1 && <p className="text-xs text-rose-600 mt-1">{errors.title1}</p>}
        </label>
      </div>

      {/* ── Subtitle ── */}
      <label className="block">
        <span className="label">Subtitle</span>
        <textarea
          className="input resize-none"
          rows={3}
          value={form.sub}
          onChange={(e) => onChange({ sub: e.target.value })}
          placeholder="Premium 3D assets from the world's most respected brands."
        />
      </label>

      {/* ── CTA + Link ── */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">CTA button text</span>
          <input
            className="input"
            value={form.cta}
            onChange={(e) => onChange({ cta: e.target.value })}
            placeholder="Explore Models"
          />
        </label>
        <label className="block">
          <span className="label">CTA link</span>
          <input
            className={`input ${errors.href ? "border-rose-500" : ""}`}
            value={form.href}
            onChange={(e) => onChange({ href: e.target.value })}
            placeholder="/c/models"
          />
          {errors.href && <p className="text-xs text-rose-600 mt-1">{errors.href}</p>}
        </label>
      </div>

      {/* ── Accent ── */}
      <label className="block">
        <span className="label">Accent text</span>
        <input
          className="input"
          value={form.accent}
          onChange={(e) => onChange({ accent: e.target.value })}
          placeholder="Villevenete · Polflex · Arbore"
        />
      </label>

      {/* ── Active toggle ── */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => onChange({ active: !form.active })}
          className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? "bg-black" : "bg-neutral-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0"}`}
          />
        </div>
        <span className="text-sm text-neutral-700">
          {form.active ? "Visible on homepage" : "Hidden from homepage"}
        </span>
      </label>

      {/* ── Typography / Font sizes (collapsible) ── */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setStylesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <span>Typography &amp; font sizes</span>
          {stylesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {stylesOpen && (
          <div className="p-4 space-y-4 bg-white">
            <SizeSlider
              label="Tag label"
              value={styles.tagSize}
              min={8} max={18} step={1} unit="px"
              hint={`${styles.tagSize}px`}
              onChange={(v) => patchStyles({ tagSize: v })}
              onReset={() => patchStyles({ tagSize: DEFAULT_STYLES.tagSize })}
            />
            <SizeSlider
              label="Headline (title)"
              value={styles.titleSize}
              min={2} max={9} step={0.5} unit="rem"
              hint={`${styles.titleSize}rem`}
              onChange={(v) => patchStyles({ titleSize: v })}
              onReset={() => patchStyles({ titleSize: DEFAULT_STYLES.titleSize })}
            />
            <SizeSlider
              label="Subtitle"
              value={styles.subSize}
              min={10} max={28} step={1} unit="px"
              hint={`${styles.subSize}px`}
              onChange={(v) => patchStyles({ subSize: v })}
              onReset={() => patchStyles({ subSize: DEFAULT_STYLES.subSize })}
            />
            <SizeSlider
              label="CTA button text"
              value={styles.ctaSize}
              min={8} max={20} step={1} unit="px"
              hint={`${styles.ctaSize}px`}
              onChange={(v) => patchStyles({ ctaSize: v })}
              onReset={() => patchStyles({ ctaSize: DEFAULT_STYLES.ctaSize })}
            />
            <SizeSlider
              label="Accent text"
              value={styles.accentSize}
              min={8} max={16} step={1} unit="px"
              hint={`${styles.accentSize}px`}
              onChange={(v) => patchStyles({ accentSize: v })}
              onReset={() => patchStyles({ accentSize: DEFAULT_STYLES.accentSize })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SizeSlider({
  label, value, min, max, step, unit, hint, onChange, onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-neutral-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
            {hint}
          </span>
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] text-neutral-400 hover:text-black underline"
          >
            reset
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded appearance-none bg-neutral-200 accent-black cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
