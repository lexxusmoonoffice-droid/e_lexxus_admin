"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Topbar from "@/components/Topbar";
import { 
  useAdminSettings, 
  useUpdateSettings, 
  useAdminSocialLinks, 
  useCreateSocialLink, 
  useUpdateSocialLink, 
  useDeleteSocialLink, 
  apiError 
} from "@/lib/hooks";
import { api } from "@/lib/api";
import { confirm } from "@/components/ConfirmDialog";
import { 
  Linkedin, Facebook, Youtube, Instagram, Twitter, 
  Github, MessageCircle, Globe, Trash2, Plus, Save
} from "lucide-react";
import type { ApiSettings, ApiSocialLink } from "@/lib/types";

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

function getSocialIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes("linkedin")) return <Linkedin className="w-3.5 h-3.5" />;
  if (k.includes("facebook")) return <Facebook className="w-3.5 h-3.5" />;
  if (k.includes("youtube")) return <Youtube className="w-3.5 h-3.5" />;
  if (k.includes("instagram")) return <Instagram className="w-3.5 h-3.5" />;
  if (k.includes("twitter") || k.includes("x.com")) return <Twitter className="w-3.5 h-3.5" />;
  if (k.includes("github")) return <Github className="w-3.5 h-3.5" />;
  if (k.includes("discord") || k.includes("whatsapp") || k.includes("slack")) return <MessageCircle className="w-3.5 h-3.5" />;
  return <Globe className="w-3.5 h-3.5" />;
}

function SettingsInner() {
  const { data, isLoading } = useAdminSettings();
  const save = useUpdateSettings();
  const qs = useSearchParams();

  // Social Links Hooks
  const { data: socialLinks = [], isLoading: isSocialLinksLoading } = useAdminSocialLinks();
  const createSocialLink = useCreateSocialLink();
  const updateSocialLink = useUpdateSocialLink();
  const deleteSocialLink = useDeleteSocialLink();

  const [form, setForm] = useState<Partial<ApiSettings>>({});
  const [zoho, setZoho] = useState<ZohoStatus | null>(null);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [zohoBusy, setZohoBusy] = useState(false);

  const [newPlatform, setNewPlatform] = useState("linkedin");
  const [customPlatform, setCustomPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const [localSocialLinks, setLocalSocialLinks] = useState<ApiSocialLink[]>([]);

  useEffect(() => {
    if (socialLinks) setLocalSocialLinks(socialLinks);
  }, [socialLinks]);

  function handleLocalLinkChange(id: string, fields: Partial<ApiSocialLink>) {
    setLocalSocialLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, ...fields } : link))
    );
  }

  async function handleUpdateLink(link: ApiSocialLink) {
    try {
      await updateSocialLink.mutateAsync({
        id: link.id,
        body: { url: link.url, order: link.order },
      });
      toast.success(`Updated ${link.platform}`);
    } catch (err) {
      toast.error(apiError(err, "Failed to update link"));
    }
  }

  async function handleToggleActive(link: ApiSocialLink, checked: boolean) {
    try {
      await updateSocialLink.mutateAsync({
        id: link.id,
        body: { active: checked },
      });
      toast.success(`${checked ? "Activated" : "Deactivated"} ${link.platform}`);
    } catch (err) {
      toast.error(apiError(err, "Failed to toggle status"));
    }
  }

  async function handleDeleteLink(link: ApiSocialLink) {
    const ok = await confirm({
      title: `Delete ${link.platform}?`,
      message: `This will remove the social link from the storefront footer.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteSocialLink.mutateAsync(link.id);
      toast.success(`Deleted ${link.platform}`);
    } catch (err) {
      toast.error(apiError(err, "Failed to delete link"));
    }
  }

  async function handleAddPlatform() {
    const key = (newPlatform === "custom" ? customPlatform : newPlatform).trim().toLowerCase();
    if (!key) {
      toast.error("Please specify a platform name");
      return;
    }
    const url = newUrl.trim();
    if (!url) {
      toast.error("Please specify a URL");
      return;
    }
    try {
      await createSocialLink.mutateAsync({
        platform: key,
        url,
        active: true,
        order: socialLinks.length,
      });
      setNewUrl("");
      setCustomPlatform("");
      setNewPlatform("linkedin");
      toast.success(`Added platform "${key}"`);
    } catch (err) {
      toast.error(apiError(err, "Failed to add social link"));
    }
  }

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
    const ok = await confirm({
      title: "Disconnect Zoho?",
      message: "Payments will stop working until you reconnect.",
      confirmText: "Disconnect",
      variant: "danger",
    });
    if (!ok) return;
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

  function setContact<K extends keyof NonNullable<ApiSettings['contact']>>(k: K, v: NonNullable<ApiSettings['contact']>[K]) {
    setForm((f) => ({
      ...f,
      contact: {
        ...(f.contact || {}),
        [k]: v,
      },
    }));
  }

  function setResponseTime(k: string, v: string) {
    setForm((f) => ({
      ...f,
      contact: {
        ...(f.contact || {}),
        responseTimes: {
          ...(f.contact?.responseTimes || {}),
          [k]: v,
        },
      },
    }));
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

            <section className="card p-6 space-y-4">
              <h3 className="font-semibold text-lg border-b border-neutral-100 pb-2">Contact & Support Details</h3>
              <p className="text-xs text-neutral-500">Customize the contact details, location map image, and standard support response times displayed on the storefront feedback page.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Contact Email</span>
                  <input className="input" type="email" value={form.contact?.email || ""} onChange={(e) => setContact("email", e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Contact Phone</span>
                  <input className="input" value={form.contact?.phone || ""} onChange={(e) => setContact("phone", e.target.value)} />
                </label>
                <label className="block col-span-2">
                  <span className="label">Office Address</span>
                  <input className="input" value={form.contact?.address || ""} onChange={(e) => setContact("address", e.target.value)} />
                </label>
                <label className="block col-span-2">
                  <span className="label">Working Hours</span>
                  <input className="input" value={form.contact?.hours || ""} onChange={(e) => setContact("hours", e.target.value)} />
                </label>
              </div>

              <h4 className="font-semibold text-sm pt-2 text-neutral-700">Office Location Map</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="label">Location Label (e.g. New York, NY)</span>
                  <input className="input" value={form.contact?.locationLabel || ""} onChange={(e) => setContact("locationLabel", e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Location Image URL</span>
                  <input className="input" value={form.contact?.locationImage || ""} onChange={(e) => setContact("locationImage", e.target.value)} />
                </label>
              </div>

              <h4 className="font-semibold text-sm pt-2 text-neutral-700">Response Times</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="block">
                  <span className="label">General Inquiries</span>
                  <input className="input" value={form.contact?.responseTimes?.general || ""} onChange={(e) => setResponseTime("general", e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Technical Support</span>
                  <input className="input" value={form.contact?.responseTimes?.technical || ""} onChange={(e) => setResponseTime("technical", e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Billing Issues</span>
                  <input className="input" value={form.contact?.responseTimes?.billing || ""} onChange={(e) => setResponseTime("billing", e.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Partnerships</span>
                  <input className="input" value={form.contact?.responseTimes?.partnerships || ""} onChange={(e) => setResponseTime("partnerships", e.target.value)} />
                </label>
              </div>
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
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Social Links</h3>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  {localSocialLinks.length} platforms
                </span>
              </div>
              <p className="text-xs text-neutral-500">Manage social media platform links. Use the active toggle, edit URLs and display orders, and save updates inline.</p>
              
              {/* Platforms List (Dynamic REST CRUD) */}
              <div className="space-y-3">
                {isSocialLinksLoading ? (
                  <div className="text-xs text-neutral-400 py-2 italic">Loading social links…</div>
                ) : localSocialLinks.length === 0 ? (
                  <div className="text-xs text-neutral-400 py-2 italic">No social media links added yet. Use the form below to add.</div>
                ) : (
                  localSocialLinks.map((link) => {
                    const original = socialLinks.find((l) => l.id === link.id);
                    const isDirty = original && (original.url !== link.url || original.order !== link.order);

                    return (
                      <div key={link.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                        {/* Active status checkbox toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={link.active}
                            onChange={(e) => handleToggleActive(link, e.target.checked)}
                            title="Toggle storefront visibility"
                            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                          />
                        </div>

                        {/* Platform name badge */}
                        <div className="capitalize font-semibold text-xs w-28 text-neutral-600 flex items-center gap-2 shrink-0">
                          <span className="text-neutral-400 shrink-0">{getSocialIcon(link.platform)}</span>
                          <span className="truncate">{link.platform}</span>
                        </div>

                        {/* URL input field */}
                        <input
                          type="url"
                          className="input flex-1 py-1 px-3 text-xs"
                          value={link.url}
                          placeholder={`URL for ${link.platform}`}
                          onChange={(e) => handleLocalLinkChange(link.id, { url: e.target.value })}
                        />

                        {/* Order sorting input field */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-neutral-400 font-semibold">Order</span>
                          <input
                            type="number"
                            min="0"
                            className="input w-16 py-1 px-2 text-center text-xs"
                            value={link.order}
                            onChange={(e) => handleLocalLinkChange(link.id, { order: Number(e.target.value) })}
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            disabled={!isDirty || updateSocialLink.isPending}
                            onClick={() => handleUpdateLink(link)}
                            className="text-emerald-600 hover:text-emerald-800 disabled:opacity-30 text-xs font-semibold px-2 py-1 transition flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLink(link)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Platform Form */}
              <div className="border-t border-neutral-200 pt-4 mt-2 space-y-3">
                <h4 className="font-semibold text-xs text-neutral-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add social platform
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-3 items-end">
                  <div>
                    <span className="label">Platform Name</span>
                    <select
                      className="input py-1.5 px-3 text-xs w-full bg-white"
                      value={newPlatform}
                      onChange={(e) => {
                        setNewPlatform(e.target.value);
                        if (e.target.value !== "custom") setCustomPlatform("");
                      }}
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="github">GitHub</option>
                      <option value="discord">Discord</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="custom">Custom…</option>
                    </select>
                  </div>
                  {newPlatform === "custom" ? (
                    <div>
                      <span className="label">Custom Platform Name</span>
                      <input
                        type="text"
                        placeholder="e.g. Pinterest"
                        className="input py-1.5 px-3 text-xs w-full"
                        value={customPlatform}
                        onChange={(e) => setCustomPlatform(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <div className="col-span-1">
                    <span className="label">URL</span>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="input py-1.5 px-3 text-xs w-full"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPlatform}
                    disabled={createSocialLink.isPending || !newUrl.trim() || (newPlatform === "custom" && !customPlatform.trim())}
                    className="btn-primary py-2 px-5 text-xs h-9 shrink-0 disabled:opacity-50 w-full sm:w-auto"
                  >
                    Add
                  </button>
                </div>
              </div>
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
