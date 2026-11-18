"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApiKey, ApiKeyEnvironment, Webhook } from "@/lib/supabase/database.types";
import { EmptyState, Field, Notice, Page, PageHeader, Panel, PanelHeader } from "@/components/app/ui";

const WEBHOOK_EVENT_OPTIONS = ["transfer.settled", "transfer.failed", "payment.received", "policy.limit_reached"];

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(iso: string | null): string {
  if (!iso) return "n/a";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function KeysPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState<ApiKeyEnvironment>("live");
  const [createStatus, setCreateStatus] = useState<"idle" | "creating" | "error">("idle");
  const [createError, setCreateError] = useState("");

  const [revealedKey, setRevealedKey] = useState<{ id: string; secret: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "creating" | "error">("idle");
  const [webhookError, setWebhookError] = useState("");

  async function fetchAll() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const [keysRes, webhooksRes] = await Promise.all([
      supabase.from("api_keys").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
      supabase.from("webhooks").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }),
    ]);
    setKeys((keysRes.data as ApiKey[]) ?? []);
    setWebhooks((webhooksRes.data as Webhook[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, []);

  // The plaintext secret only ever exists in memory, between generation and
  // dismissal. It is never written to the database or to storage, so once
  // this clears (dismiss, or the component unmounts) it is genuinely gone.
  useEffect(() => {
    return () => setRevealedKey(null);
  }, []);

  async function handleGenerate() {
    if (!newName.trim() || !userId) return;
    setCreateStatus("creating");
    setCreateError("");
    try {
      const supabase = createClient();
      const randomBytes = crypto.getRandomValues(new Uint8Array(24));
      const randomHex = toHex(randomBytes);
      const prefix = newEnv === "live" ? "vl_live_" : "vl_test_";
      const fullKey = `${prefix}${randomHex}`;
      const digestBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fullKey));
      const keyHash = toHex(new Uint8Array(digestBuf));
      const keyLast4 = fullKey.slice(-4);

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          profile_id: userId,
          name: newName.trim(),
          key_prefix: prefix,
          key_last4: keyLast4,
          key_hash: keyHash,
          environment: newEnv,
          active: true,
        } as never)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const created = data as ApiKey;
      setKeys((prev) => [created, ...prev]);
      setRevealedKey({ id: created.id, secret: fullKey });
      setNewName("");
      setNewEnv("live");
      setShowNew(false);
      setCreateStatus("idle");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreateStatus("error");
    }
  }

  async function handleRevoke(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("api_keys").update({ active: false } as never).eq("id", id);
    if (!error) {
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
    }
  }

  async function handleCopySecret() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.secret);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      // clipboard API unavailable, nothing more we can do here
    }
  }

  function toggleWebhookEvent(evt: string) {
    setNewWebhookEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
  }

  async function handleAddWebhook() {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0 || !userId) return;
    setWebhookStatus("creating");
    setWebhookError("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("webhooks")
        .insert({ profile_id: userId, url: newWebhookUrl.trim(), events: newWebhookEvents, active: true } as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      setWebhooks((prev) => [data as Webhook, ...prev]);
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      setShowAddWebhook(false);
      setWebhookStatus("idle");
    } catch (err) {
      setWebhookError(err instanceof Error ? err.message : "Something went wrong");
      setWebhookStatus("error");
    }
  }

  async function handleToggleWebhook(id: string, active: boolean) {
    const supabase = createClient();
    const { error } = await supabase.from("webhooks").update({ active: !active } as never).eq("id", id);
    if (!error) {
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active: !active } : w)));
    }
  }

  async function handleDeleteWebhook(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (!error) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    }
  }

  const webhookDisabled = !newWebhookUrl.trim() || newWebhookEvents.length === 0 || webhookStatus === "creating";

  return (
    <Page className="max-w-[880px]">
      <PageHeader
        title="API keys"
        description="Manage keys for initiating transfers and configuring agent payment policies."
        actions={
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            aria-expanded={showNew}
            className={showNew ? "btn btn-secondary" : "btn btn-primary"}
          >
            {showNew ? "Cancel" : "New key"}
          </button>
        }
      />

      <div className="flex flex-col gap-4">
        {/* One-time secret reveal */}
        {revealedKey && (
          <Panel className="veil-in">
            <PanelHeader title="Your new API key" />
            <Notice tone="warn" className="mb-3">
              This is the only time this key will be shown. Copy it now and store it securely.
            </Notice>
            <div className="well flex items-center gap-2 py-2 pl-3 pr-2">
              <code className="t-mono min-w-0 flex-1 break-all text-[13px] text-fg">{revealedKey.secret}</code>
              <button
                type="button"
                onClick={handleCopySecret}
                className="btn btn-secondary btn-sm shrink-0"
                aria-label={copyStatus === "copied" ? "Copied API key" : "Copy API key"}
              >
                {copyStatus === "copied" ? "Copied" : "Copy"}
              </button>
            </div>
            <span className="sr-only" aria-live="polite">
              {copyStatus === "copied" ? "Key copied to clipboard" : ""}
            </span>
            <button type="button" onClick={() => setRevealedKey(null)} className="btn btn-ghost btn-sm mt-3">
              I&apos;ve saved it, dismiss
            </button>
          </Panel>
        )}

        {/* New key form */}
        {showNew && (
          <Panel className="veil-in">
            <PanelHeader
              title="Create new API key"
              description="The key will be shown once. Store it securely, since you cannot retrieve it again."
            />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Key name" htmlFor="new-key-name" className="min-w-0 flex-[1_1_220px]">
                <input
                  id="new-key-name"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production"
                />
              </Field>
              <div>
                <div className="field-label" id="new-key-env-label">
                  Environment
                </div>
                <div className="segmented h-10 items-center" role="group" aria-labelledby="new-key-env-label">
                  {(["live", "test"] as ApiKeyEnvironment[]).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setNewEnv(env)}
                      aria-pressed={newEnv === env}
                      className="capitalize"
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!newName.trim() || createStatus === "creating"}
                className="btn btn-primary"
              >
                {createStatus === "creating" ? "Generating..." : "Generate"}
              </button>
            </div>
            {createStatus === "error" && (
              <Notice tone="danger" className="mt-3">
                {createError}
              </Notice>
            )}
          </Panel>
        )}

        {/* Keys list */}
        <Panel padded={false}>
          <PanelHeader title="Keys" className="mb-0 border-b border-line px-5 py-4" />
          {loading ? (
            <div className="divided" aria-busy="true" aria-label="Loading keys">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-5 py-4">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton mt-2 h-3.5 w-56" />
                </div>
              ))}
            </div>
          ) : keys.length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Create a key to start initiating transfers from your code or agents."
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowNew(true)}>
                  New key
                </button>
              }
            />
          ) : (
            <ul className="divided">
              {keys.map((key) => (
                <li key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium text-fg">{key.name}</span>
                      <span className={key.environment === "test" ? "badge badge-warn" : "badge"}>
                        {key.environment === "test" ? "Test" : "Live"}
                      </span>
                      <span className={key.active ? "badge badge-ok" : "badge badge-danger"}>
                        <span className="dot" />
                        {key.active ? "Active" : "Revoked"}
                      </span>
                    </div>
                    <div className="t-mono mt-1.5 break-all text-[13px] text-fg-body">
                      {key.key_prefix}
                      <span className="text-fg-faint">{"•".repeat(4)}</span>
                      {key.key_last4}
                    </div>
                    <div className="t-num mt-1 text-[12.5px] text-fg-muted">
                      Created {formatDate(key.created_at)} · Last used {formatDate(key.last_used_at)}
                    </div>
                  </div>
                  {key.active && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(key.id)}
                      className="btn btn-ghost btn-sm text-danger hover:text-danger"
                      aria-label={`Revoke key ${key.name}`}
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Webhooks */}
        <Panel padded={false}>
          <PanelHeader
            title="Webhooks"
            className="mb-0 border-b border-line px-5 py-4"
            actions={
              <button
                type="button"
                onClick={() => setShowAddWebhook(!showAddWebhook)}
                aria-expanded={showAddWebhook}
                className="btn btn-secondary btn-sm"
              >
                {showAddWebhook ? "Cancel" : "Add endpoint"}
              </button>
            }
          />

          {showAddWebhook && (
            <div className="border-b border-line px-5 py-4">
              <Field label="Endpoint URL" htmlFor="new-webhook-url">
                <input
                  id="new-webhook-url"
                  className="input t-mono text-[13px]"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://example.com/veiled/webhook"
                />
              </Field>
              <div className="mt-3">
                <div className="field-label" id="webhook-events-label">
                  Events
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="webhook-events-label">
                  {WEBHOOK_EVENT_OPTIONS.map((evt) => {
                    const selected = newWebhookEvents.includes(evt);
                    return (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleWebhookEvent(evt)}
                        aria-pressed={selected}
                        className={`t-mono h-8 rounded-lg border px-2.5 text-[12.5px] transition-colors ${
                          selected
                            ? "border-signal/35 bg-signal/10 text-signal"
                            : "border-line-strong text-fg-muted hover:bg-white/5 hover:text-fg"
                        }`}
                      >
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </div>
              {webhookStatus === "error" && (
                <Notice tone="danger" className="mt-3">
                  {webhookError}
                </Notice>
              )}
              <button
                type="button"
                onClick={handleAddWebhook}
                disabled={webhookDisabled}
                className="btn btn-secondary btn-sm mt-4"
              >
                {webhookStatus === "creating" ? "Adding..." : "Add webhook"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="divided" aria-busy="true" aria-label="Loading webhooks">
              {[0, 1].map((i) => (
                <div key={i} className="px-5 py-4">
                  <div className="skeleton h-4 w-64 max-w-full" />
                  <div className="skeleton mt-2 h-5 w-40" />
                </div>
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <EmptyState
              title="No webhooks configured yet"
              description="Add an endpoint to receive transfer and payment events."
              action={
                !showAddWebhook && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddWebhook(true)}>
                    Add endpoint
                  </button>
                )
              }
            />
          ) : (
            <ul className="divided">
              {webhooks.map((wh) => (
                <li key={wh.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="t-mono mb-1.5 break-all text-[13px] text-fg">{wh.url}</div>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.length === 0 ? (
                        <span className="text-[12.5px] text-fg-faint">n/a</span>
                      ) : (
                        wh.events.map((e) => (
                          <span key={e} className="badge t-mono">
                            {e}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleWebhook(wh.id, wh.active)}
                      className={`badge cursor-pointer transition-opacity hover:opacity-80 ${wh.active ? "badge-ok" : ""}`}
                      aria-label={`${wh.active ? "Deactivate" : "Activate"} webhook ${wh.url}`}
                    >
                      <span className="dot" />
                      {wh.active ? "Active" : "Inactive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="btn btn-ghost btn-sm text-danger hover:text-danger"
                      aria-label={`Remove webhook ${wh.url}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Docs callout */}
        <Panel className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-fg">API documentation</div>
            <div className="mt-0.5 text-[13px] text-fg-muted">
              Integrate Veiled into your product with our REST API or MCP server.
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            View docs
          </button>
        </Panel>
      </div>
    </Page>
  );
}
