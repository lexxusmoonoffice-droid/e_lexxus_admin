"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Topbar from "@/components/Topbar";
import RichEditor from "@/components/RichEditor";
import ImageUploader, { ImageChip } from "@/components/ImageUploader";
import {
  useCreateBlogPost,
  useUpdateBlogPost,
  apiError,
} from "@/lib/hooks";
import type { ApiBlogPost } from "@/lib/types";

type Form = {
  title: string;
  excerpt?: string;
  content?: string;
  image?: string;
  status: "draft" | "published";
};

export default function BlogForm({
  mode,
  existing,
}: {
  mode: "new" | "edit";
  existing?: ApiBlogPost;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    title: existing?.title || "",
    excerpt: existing?.excerpt,
    content: existing?.content,
    image: existing?.image,
    status: existing?.status || "draft",
  });

  useEffect(() => {
    if (existing)
      setForm({
        title: existing.title || "",
        excerpt: existing.excerpt,
        content: existing.content,
        image: existing.image,
        status: existing.status,
      });
  }, [existing]);

  const createM = useCreateBlogPost();
  const updateM = useUpdateBlogPost(existing?.id || "");
  const busy = createM.isPending || updateM.isPending;

  const errors = useMemo<Record<string, string | null>>(() => ({
    title: !form.title.trim() ? "Title is required" : form.title.length > 200 ? "Max 200 characters" : null,
    excerpt: (form.excerpt?.length || 0) > 500 ? "Max 500 characters" : null,
    content: form.status === "published" && !(form.content || "").trim() ? "Content is required before publishing" : null,
  }), [form.title, form.excerpt, form.content, form.status]);
  const hasErrors = Object.values(errors).some(Boolean);

  async function save() {
    if (hasErrors) return;
    try {
      if (mode === "new") {
        const res = await createM.mutateAsync(form);
        toast.success("Post created");
        router.push(`/blog/${res.post.id}`);
      } else {
        await updateM.mutateAsync(form);
        toast.success("Saved");
      }
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    }
  }

  return (
    <>
      <Topbar title={mode === "new" ? "New post" : `Edit: ${form.title || "…"}`} />
      <div className="p-6 space-y-6 max-w-[1000px]">
        <section className="card p-6 space-y-4">
          <label className="block">
            <span className="label">Title <span className="text-rose-600">*</span></span>
            <input
              className={`input ${errors.title ? "border-rose-500" : ""}`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
            />
            {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
          </label>
          <label className="block">
            <span className="label">Excerpt <span className="text-[10px] text-neutral-400 ml-1">optional, max 500</span></span>
            <textarea
              className={`input min-h-[80px] ${errors.excerpt ? "border-rose-500" : ""}`}
              maxLength={500}
              value={form.excerpt || ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
            <p className="text-xs text-neutral-500 mt-1">{(form.excerpt || "").length}/500</p>
            {errors.excerpt && <p className="text-xs text-rose-600 mt-1">{errors.excerpt}</p>}
          </label>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">
            Content
            {form.status === "published" && <span className="text-rose-600 ml-1">*</span>}
          </h3>
          <RichEditor value={form.content || ""} onChange={(c) => setForm({ ...form, content: c })} />
          {errors.content && <p className="text-xs text-rose-600 mt-1">{errors.content}</p>}
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="font-semibold">Featured image</h3>
          {form.image ? (
            <ImageChip url={form.image} onRemove={() => setForm({ ...form, image: undefined })} />
          ) : (
            <p className="text-xs text-neutral-500">No image yet.</p>
          )}
          {mode === "edit" && existing ? (
            <ImageUploader kind="blog" refId={existing.id} label="Upload featured image" onUploaded={(url) => setForm({ ...form, image: url })} />
          ) : (
            <p className="text-xs text-neutral-500">Save the post first, then come back to upload an image.</p>
          )}
        </section>

        <section className="card p-6 space-y-4">
          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form["status"] })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </section>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={busy || hasErrors}
            title={hasErrors ? "Fix errors before saving" : undefined}
            className="btn-primary disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "new" ? "Create post" : "Save changes"}
          </button>
          <Link href="/blog" className="btn-outline">
            <X className="w-4 h-4 mr-1 inline" /> Cancel
          </Link>
          {hasErrors && <span className="text-xs text-rose-600 self-center">Fix the highlighted fields to continue.</span>}
        </div>
      </div>
    </>
  );
}
