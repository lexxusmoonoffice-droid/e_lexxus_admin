"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileArchive, CheckCircle, Loader2 } from "lucide-react";
import { api, apiError } from "@/lib/api";

interface DirectUploadResponse {
  fileKey: string;
  fileSizeMb: number;
  file: { sizeBytes: number; b2FileName: string };
}

/**
 * ZIP uploader — streams the file through the backend so the browser
 * doesn't need B2 CORS permission. The backend validates magic bytes,
 * puts to B2, and attaches to the product when `productId` is given.
 */
export default function ZipUploader({
  productId,
  onUploaded,
}: {
  productId: string;
  onUploaded?: (meta: { fileKey: string; sizeMb: number }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  async function pick(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only ZIP files are allowed");
      return;
    }
    setBusy(true);
    setProgress(0);
    setSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", productId);
      const res = await api.post<DirectUploadResponse>("/uploads/product-file", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      const mb = res.data.fileSizeMb ?? 0;
      setSummary(`${file.name} · ${mb} Mb`);
      onUploaded?.({ fileKey: res.data.fileKey, sizeMb: mb });
      toast.success("ZIP uploaded + verified");
    } catch (err) {
      toast.error(apiError(err, "Upload failed"));
    } finally {
      setBusy(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border-2 border-dashed border-neutral-300 p-6 text-center">
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />
      {!busy && !summary && (
        <>
          <FileArchive className="w-8 h-8 mx-auto text-neutral-400" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 text-sm font-medium underline"
          >
            Upload product ZIP
          </button>
          <p className="text-xs text-neutral-400 mt-1">ZIP only · max 2 GB</p>
        </>
      )}
      {busy && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="text-xs">Uploading… {progress}%</div>
          <div className="w-full max-w-md h-1 bg-neutral-100 rounded overflow-hidden">
            <div className="h-full bg-black transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {summary && !busy && (
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" /> {summary}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="ml-4 text-xs underline text-neutral-500"
          >
            Replace
          </button>
        </div>
      )}
    </div>
  );
}
