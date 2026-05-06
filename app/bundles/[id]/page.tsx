"use client";

import { useParams } from "next/navigation";
import BundleForm from "@/components/BundleForm";
import Topbar from "@/components/Topbar";
import { useAdminBundle } from "@/lib/hooks";

export default function EditBundlePage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useAdminBundle(params?.id as string);

  if (isLoading) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="p-6 text-sm text-neutral-500">Loading bundle…</div>
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <Topbar title="Not found" />
        <div className="p-6 text-sm text-rose-600">Bundle not found.</div>
      </>
    );
  }
  return <BundleForm mode="edit" existing={data.bundle} />;
}
