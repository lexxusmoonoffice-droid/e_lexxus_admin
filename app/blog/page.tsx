"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { useAdminBlog, useDeleteBlogPost, apiError } from "@/lib/hooks";

export default function BlogListPage() {
  const { data, isLoading } = useAdminBlog({ limit: 100 });
  const del = useDeleteBlogPost();

  async function onDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const posts = data?.data || [];

  return (
    <>
      <Topbar title="Blog" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-neutral-500">
            {isLoading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""}`}
          </p>
          <Link href="/blog/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Post
          </Link>
        </div>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">Post</th>
                <th className="table-th">Author</th>
                <th className="table-th">Date</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && posts.length === 0 && (
                <tr><td colSpan={5} className="table-td text-center text-neutral-400 py-12">No posts yet</td></tr>
              )}
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      {p.image && <img src={p.image} className="w-10 h-10 rounded object-cover" alt={p.title} />}
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-neutral-400">/{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs">{p.authorName || "—"}</td>
                  <td className="table-td text-xs">
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString()
                      : p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="table-td"><StatusPill value={p.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <Link href={`/blog/${p.id}`} className="p-1.5 hover:bg-neutral-100 rounded"><Edit className="w-4 h-4" /></Link>
                      <button onClick={() => onDelete(p.id, p.title)} className="p-1.5 hover:bg-red-50 text-red-500 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
