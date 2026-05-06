"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Topbar from "@/components/Topbar";
import { useAdminSettings, useUpdateSettings, apiError } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ApiSettings } from "@/lib/types";

type ZohoStatus = {
  connected: boolean;
  connectedAt: string | null;
  scope: string | null;
  accountsHost: string;
  webhookSecretSet: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  callbackUri: string;
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const { data, isLoading } = useAdminSettings();
  const save = useUpdateSettings();
  const qs = useSearchParams();

  const [form, setForm] = useState<Partial<ApiSettings>>({});
  const [zoho, setZoho] = useState<ZohoStatus | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [zohoBusy, setZohoBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  useEffect(() => {
    const flag = qs?.get("zoho");
    if (flag === "connected") toast.success("Zoho connected");
    if (flag === "error") toast.error(`Zoho connect failed: ${qs?.get("reason") || ""}`);
  }, [qs]);

  async function loadZohoStatus() {
    try {
      const { data: s } = await api.get<ZohoStatus>("/zoho/status");
      setZoho(s);
    } catch (err) {
      setZoho(null);
    }
  }
  useEffect(() => { loadZohoStatus(); }, [qs]);

  async function onConnect() {
    setZohoBusy(true);
    try {
      const { data: res } = await api.get<{ authUrl: string }>("/zoho/connect");
      window.location.href = res.authUrl;
    } catch (err) {
      toast.error(apiError(err, "Zoho connect failed"));
      setZohoBusy(false);
    }
  }
  async function onDisconnect() {
    if (!confirm("Disconnect Zoho? Payments will stop working until reconnected.")) return;
    setZohoBusy(true);
    try {
      await api.post("/zoho/disconnect");
      toast.success("Zoho disconnected");
      loadZohoStatus();
    } catch (err) {
      toast.error(apiError(err, "Disconnect failed"));
    } finally {
      setZohoBusy(false);
    }
  }
  async function onSaveSecret() {
    if (webhookSecret.length < 8) {
      toast.error("Webhook secret must be at least 8 characters");
      return;
    }
    setZohoBusy(true);
    try {
      await api.post("/zoho/webhook-secret", { secret: webhookSecret });
      toast.success("Webhook secret stored");
      setWebhookSecret("");
      loadZohoStatus();
    } catch (err) {
      toast.error(apiError(err, "Save failed"));
    } finally {
      setZohoBusy(false);
    }
  }

  function set<K extends keyof ApiSettings>(k: K, v: ApiSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="p-6 max-w-[900px]">
        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-6">
            <section className="card p-6 space-y-4">
              <h3 className="font-semibold">Store</h3>
              <label className="block">
                <span className="label">Store name</span>
                <input className="input" value={form.storeName || ""} onChange={(e) => set("storeName", e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Support email</span>
                <input className="input" type="email" value={form.supportEmail || ""} onChange={(e) => set("supportEmail", e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Default currency</span>
                <select
                  className="input"
                  value={form.defaultCurrency || "INR"}
                  onChange={(e) => set("defaultCurrency", e.target.value)}
                >
                  <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                </select>
              </label>
            </section>

            <section className="card p-6 space-y-3">
              <h3 className="font-semibold">Payments</h3>
              {(["zohoEnabled", "stripeEnabled", "paypalEnabled"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.payments?.[k]}
                    onChange={(e) =>
                      set("payments", { ...(form.payments || {}), [k]: e.target.checked })
                    }
                  />
                  {k.replace("Enabled", "")}
                </label>
              ))}
            </section>

            <section className="card p-6 space-y-4">
              <h3 className="font-semibold">Social Links</h3>
              <p className="text-xs text-neutral-500">Enter full URLs (e.g. https://twitter.com/lexxus). Leave blank to hide the icon.</p>
              {(["linkedin", "facebook", "youtube", "instagram", "twitter"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="label capitalize">{key}</span>
                  <input
                    className="input"
                    type="url"
                    placeholder={`https://${key}.com/yourpage`}
                    value={(form.social as Record<string, string> | undefined)?.[key] || ""}
                    onChange={(e) =>
                      set("social", { ...(form.social || {}), [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </section>

            <button disabled={save.isPending} className="btn-primary disabled:opacity-50">
              {save.isPending ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}

        <section className="card p-6 space-y-4 mt-8">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Zoho Payments</h3>
            {zoho && (
              <span className={`text-xs px-2 py-1 rounded ${zoho.connected ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                {zoho.connected ? "Connected" : "Not connected"}
              </span>
            )}
          </div>

          {!zoho ? (
            <p className="text-sm text-neutral-500">Loading status…</p>
          ) : (
            <>
              <div className="text-xs text-neutral-500 space-y-1">
                <div>Callback URL (register this in Zoho console): <code className="bg-neutral-100 px-1">{zoho.callbackUri}</code></div>
                <div>Client ID set: {zoho.clientIdSet ? "✓" : "✗ (add ZOHO_CLIENT_ID to backend .env)"}</div>
                <div>Client secret set: {zoho.clientSecretSet ? "✓" : "✗ (add ZOHO_CLIENT_SECRET to backend .env)"}</div>
                <div>Webhook secret set: {zoho.webhookSecretSet ? "✓" : "✗"}</div>
                {zoho.connected && <div>Connected at: {zoho.connectedAt ? new Date(zoho.connectedAt).toLocaleString() : "—"}</div>}
                {zoho.scope && <div>Scope: <code className="bg-neutral-100 px-1 text-[10px]">{zoho.scope}</code></div>}
              </div>

              <div className="flex gap-2 flex-wrap">
                {!zoho.connected ? (
                  <button onClick={onConnect} disabled={zohoBusy || !zoho.clientIdSet} className="btn-primary disabled:opacity-50">
                    {zohoBusy ? "Redirecting…" : "Connect Zoho"}
                  </button>
                ) : (
                  <>
                    <button onClick={onConnect} disabled={zohoBusy} className="btn-outline disabled:opacity-50">
                      Reconnect
                    </button>
                    <button onClick={onDisconnect} disabled={zohoBusy} className="btn-outline text-rose-600 disabled:opacity-50">
                      Disconnect
                    </button>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <label className="block">
                  <span className="label">Webhook secret</span>
                  <p className="text-xs text-neutral-500 mb-2">
                    Paste the secret you configured in the Zoho webhook screen. Used to verify <code>/api/payments/webhook</code> payloads.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className="input flex-1"
                      value={webhookSecret}
                      placeholder={zoho.webhookSecretSet ? "•••••••• (already set, paste to replace)" : "Paste webhook secret"}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                    />
                    <button onClick={onSaveSecret} disabled={zohoBusy || webhookSecret.length < 8} className="btn-primary disabled:opacity-50">
                      Save
                    </button>
                  </div>
                </label>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
