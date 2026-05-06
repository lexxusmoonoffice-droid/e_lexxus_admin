"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, X } from "lucide-react";
import { api, apiError } from "@/lib/api";

type Kind = "product" | "bundle" | "blog" | "hero" | "avatar" | "brand";

interface UploadResponse {
  fileKey: string;
  kind: Kind;
  urls: { original: string; thumbnail?: string; card?: string; full?: string };
}

/**
 * Single-shot image uploader — streams the file to the backend,
 * which validates magic bytes, puts to B2, runs Sharp variants, and
 * (optionally) attaches the result to an entity. Avoids the browser
 * ever needing CORS-configured direct access to B2.
 */
export default function ImageUploader({
  kind,
  refId,
  role,
  onUploaded,
  label = "Upload image",
}: {
  kind: Kind;
  refId?: string;
  role?: "thumbnail" | "gallery";
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function pick(file: File) {
    setBusy(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      if (refId) form.append("refId", refId);
      if (role) form.append("role", role);
      const res = await api.post<UploadResponse>("/uploads/image", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const url = res.data.urls.full || res.data.urls.original;
      onUploaded(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(apiError(err, "Upload failed"));
    } finally {
      setBusy(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs hover:border-black disabled:opacity-50"
      >
        <ImagePlus className="w-4 h-4" />
        {busy ? `Uploading ${progress}%` : label}
      </button>
      {busy && (
        <div className="mt-2 h-1 bg-neutral-100 rounded overflow-hidden">
          <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

/** Small display component that renders an image preview with remove button. */
export function ImageChip({ url, onRemove }: { url: string; onRemove?: () => void }) {
  return (
    <div className="relative inline-block">
      <img src={url} alt="" className="w-24 h-24 object-cover rounded border border-neutral-200" />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-black text-white w-5 h-5 rounded-full flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
