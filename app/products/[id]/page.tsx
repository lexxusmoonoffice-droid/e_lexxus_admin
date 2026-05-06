"use client";

import { useParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import Topbar from "@/components/Topbar";
import { useAdminProduct } from "@/lib/hooks";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { data, isLoading, isError } = useAdminProduct(id);

  if (isLoading) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="p-6 text-sm text-neutral-500">Loading product…</div>
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <Topbar title="Not found" />
        <div className="p-6 text-sm text-rose-600">Product not found or failed to load.</div>
      </>
    );
  }
  return <ProductForm mode="edit" existing={data.product} />;
}
