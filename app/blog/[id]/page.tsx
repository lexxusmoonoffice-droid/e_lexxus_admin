"use client";

import { useParams } from "next/navigation";
import BlogForm from "@/components/BlogForm";
import Topbar from "@/components/Topbar";
import { useAdminBlogPost } from "@/lib/hooks";

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useAdminBlogPost(params?.id as string);

  if (isLoading) {
    return (
      <>
        <Topbar title="Loading…" />
        <div className="p-6 text-sm text-neutral-500">Loading…</div>
      </>
    );
  }
  if (isError || !data) {
    return (
      <>
        <Topbar title="Not found" />
        <div className="p-6 text-sm text-rose-600">Post not found.</div>
      </>
    );
  }
  return <BlogForm mode="edit" existing={data.post} />;
}
