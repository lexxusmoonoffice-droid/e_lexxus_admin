"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Eye, Ban } from "lucide-react";
import Topbar from "@/components/Topbar";
import StatusPill from "@/components/StatusPill";
import { useAdminUsers, useSuspendUser, apiError } from "@/lib/hooks";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const params: Record<string, unknown> = { limit: 100 };
  if (search) params.q = search;
  if (statusFilter !== "All") params.status = statusFilter;

  const { data, isLoading } = useAdminUsers(params);
  const suspend = useSuspendUser();

  async function toggleSuspend(id: string, current: "active" | "suspended") {
    const next = current === "active" ? "suspended" : "active";
    if (!confirm(`${next === "suspended" ? "Suspend" : "Reactivate"} this user?`)) return;
    try {
      await suspend.mutateAsync({ id, status: next });
      toast.success(next === "suspended" ? "User suspended" : "User reactivated");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const users = data?.data || [];

  return (
    <>
      <Topbar title="Users" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <input
            placeholder="Search name or email…"
            className="input w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>active</option>
            <option>suspended</option>
          </select>
        </div>

        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-neutral-50">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Status</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && users.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-neutral-400 py-12">No users found</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-400 text-white text-xs flex items-center justify-center">
                        {(u.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        {!u.verified && <div className="text-[10px] text-amber-600">Not verified</div>}
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-sm">{u.email}</td>
                  <td className="table-td capitalize text-xs">{u.role}</td>
                  <td className="table-td text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="table-td"><StatusPill value={u.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button
                        className={`p-1.5 rounded ${u.status === "suspended" ? "hover:bg-emerald-50 text-emerald-600" : "hover:bg-red-50 text-red-500"}`}
                        onClick={() => toggleSuspend(u.id, u.status)}
                        title={u.status === "suspended" ? "Reactivate" : "Suspend"}
                      >
                        {u.status === "suspended" ? <Eye className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
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
