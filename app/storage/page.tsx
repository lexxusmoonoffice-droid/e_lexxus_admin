"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HardDrive,
  RefreshCw,
  FolderOpen,
  File,
  Clock,
  TrendingUp,
  Database,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Topbar from "@/components/Topbar";
import { api, apiError } from "@/lib/api";

/* ─── types ─────────────────────────────────────────────────────── */

type Folder = { name: string; files: number; bytes: number };
type FileEntry = { key: string; size: number; lastModified: string };

type Stats = {
  bucket: string;
  region: string;
  endpoint: string;
  totalFiles: number;
  totalBytes: number;
  folders: Folder[];
  recentFiles: FileEntry[];
  largestFiles: FileEntry[];
  fetchedAt: string;
  cached: boolean;
};

/* ─── helpers ────────────────────────────────────────────────────── */

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function pct(bytes: number, total: number): number {
  return total === 0 ? 0 : Math.max(1, Math.round((bytes / total) * 100));
}

const FOLDER_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-neutral-400",
];

/* ─── stat card ─────────────────────────────────────────────────── */

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 font-medium">{label}</p>
        <p className="text-2xl font-bold leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */

export default function StoragePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Stats>("/admin/integrations/storage/stats");
      setStats(data);
      if (isRefresh) toast.success(data.cached ? "Showing cached data (refreshes every 2 min)" : "Live data fetched");
    } catch (err) {
      const msg = apiError(err, "Failed to load storage stats");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <>
        <Topbar title="Storage" />
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-neutral-100" />
          ))}
        </div>
      </>
    );
  }

  /* ── error state ── */
  if (error || !stats) {
    return (
      <>
        <Topbar title="Storage" />
        <div className="p-6">
          <div className="card p-6 flex items-start gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load storage stats</p>
              <p className="text-sm text-neutral-500 mt-1">{error}</p>
              <button onClick={() => load()} className="btn-outline mt-3 text-sm">Try again</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Storage"
        actions={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-outline flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Fetching…" : "Refresh"}
          </button>
        }
      />

      <div className="p-6 space-y-6 max-w-[1100px]">

        {/* cache notice */}
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>
            Bucket: <strong className="text-neutral-700">{stats.bucket}</strong> ·{" "}
            Region: <strong className="text-neutral-700">{stats.region}</strong>
          </span>
          <span>
            {stats.cached ? "⚡ Cached · " : ""}Last fetched {fmtDate(stats.fetchedAt)}
          </span>
        </div>

        {/* top-line stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={HardDrive}
            label="Total storage used"
            value={fmtBytes(stats.totalBytes)}
            color="bg-violet-500"
          />
          <StatCard
            icon={Database}
            label="Total files"
            value={stats.totalFiles.toLocaleString()}
            color="bg-blue-500"
          />
          <StatCard
            icon={FolderOpen}
            label="Folders"
            value={String(stats.folders.length)}
            color="bg-emerald-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg file size"
            value={stats.totalFiles > 0 ? fmtBytes(Math.round(stats.totalBytes / stats.totalFiles)) : "—"}
            color="bg-amber-500"
          />
        </div>

        {/* storage by folder */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-neutral-400" />
            Storage by folder
          </h3>
          {stats.folders.length === 0 ? (
            <p className="text-sm text-neutral-400">No files found in bucket.</p>
          ) : (
            <div className="space-y-3">
              {stats.folders.map((folder, idx) => (
                <div key={folder.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-mono text-neutral-700 truncate max-w-[200px]">
                      {folder.name}/
                    </span>
                    <div className="flex items-center gap-4 text-neutral-500 text-xs shrink-0">
                      <span>{folder.files.toLocaleString()} files</span>
                      <span className="font-semibold text-neutral-800">{fmtBytes(folder.bytes)}</span>
                      <span className="w-8 text-right">{pct(folder.bytes, stats.totalBytes)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${FOLDER_COLORS[idx % FOLDER_COLORS.length]}`}
                      style={{ width: `${pct(folder.bytes, stats.totalBytes)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* recently uploaded */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              Recently uploaded
            </h3>
            {stats.recentFiles.length === 0 ? (
              <p className="text-sm text-neutral-400">No files.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentFiles.map((f) => (
                  <div key={f.key} className="flex items-start justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-neutral-700 truncate" title={f.key}>
                        {f.key.split("/").pop()}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">{f.key}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-neutral-700">{fmtBytes(f.size)}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">{fmtDate(f.lastModified)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* largest files */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <File className="w-4 h-4 text-neutral-400" />
              Largest files
            </h3>
            {stats.largestFiles.length === 0 ? (
              <p className="text-sm text-neutral-400">No files.</p>
            ) : (
              <div className="space-y-2">
                {stats.largestFiles.map((f, idx) => (
                  <div key={f.key} className="flex items-start justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-xs text-neutral-400 w-4 pt-0.5 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-neutral-700 truncate" title={f.key}>
                          {f.key.split("/").pop()}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5">{f.key}</p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800 shrink-0">{fmtBytes(f.size)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* endpoint info */}
        <div className="card p-5 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Endpoint</p>
            <p className="font-mono text-neutral-700 text-xs">{stats.endpoint}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Bucket</p>
            <p className="font-mono text-neutral-700 text-xs">{stats.bucket}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Region</p>
            <p className="font-mono text-neutral-700 text-xs">{stats.region}</p>
          </div>
        </div>

      </div>
    </>
  );
}
