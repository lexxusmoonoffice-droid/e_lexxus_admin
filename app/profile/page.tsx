"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { User, Lock, Save } from "lucide-react";
import Topbar from "@/components/Topbar";
import { useAuth } from "@/lib/auth";
import { apiPost, apiPut, apiError } from "@/lib/api";

export default function ProfilePage() {
  const { user, refresh } = useAuth();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    if (user) setProfile({ name: user.name || "", email: user.email || "" });
  }, [user]);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.name.trim()) { toast.error("Name is required"); return; }
    setProfileBusy(true);
    try {
      await apiPost("/users/me", { name: profile.name.trim() });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(apiError(err, "Update failed"));
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwd.current) { toast.error("Current password is required"); return; }
    if (pwd.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("Passwords don't match"); return; }
    setPwdBusy(true);
    try {
      await apiPost("/users/me/password", { currentPassword: pwd.current, newPassword: pwd.next });
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(apiError(err, "Password change failed"));
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <>
      <Topbar title="My Profile" />
      <div className="p-6 max-w-5xl">

        {/* Avatar */}
        <div className="card p-6 flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-base">{user?.name || "—"}</p>
            <p className="text-sm text-neutral-500">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Profile info */}
          <section className="card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" /> Account info
            </h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <label className="block">
                <span className="label">Full name</span>
                <input
                  className="input"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input
                  className="input bg-neutral-50 cursor-not-allowed"
                  value={profile.email}
                  readOnly
                  title="Email cannot be changed here"
                />
                <p className="text-xs text-neutral-400 mt-1">Contact support to change your email.</p>
              </label>
              <button type="submit" disabled={profileBusy} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" />
                {profileBusy ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>

          {/* Password */}
          <section className="card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4" /> Change password
            </h3>
            <form onSubmit={savePassword} className="space-y-4">
              <label className="block">
                <span className="label">Current password</span>
                <input
                  className="input"
                  type="password"
                  value={pwd.current}
                  onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                  autoComplete="current-password"
                />
              </label>
              <label className="block">
                <span className="label">New password</span>
                <input
                  className="input"
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                  minLength={8}
                />
                <p className="text-xs text-neutral-400 mt-1">Minimum 8 characters.</p>
              </label>
              <label className="block">
                <span className="label">Confirm new password</span>
                <input
                  className="input"
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
                {pwd.confirm && pwd.next !== pwd.confirm && (
                  <p className="text-xs text-rose-600 mt-1">Passwords don&apos;t match.</p>
                )}
              </label>
              <button type="submit" disabled={pwdBusy} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {pwdBusy ? "Changing…" : "Change password"}
              </button>
            </form>
          </section>
        </div>

      </div>
    </>
  );
}
