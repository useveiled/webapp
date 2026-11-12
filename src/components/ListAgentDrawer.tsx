"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PrivacyTier } from "@/lib/supabase/database.types";
import { Notice } from "@/components/app/ui";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export const PRIVACY_TIERS: { value: PrivacyTier; label: string }[] = [
  { value: "confidential", label: "Confidential" },
  { value: "shielded", label: "Shielded" },
];

/* Required-field marker. The input itself carries `required`. */
export function RequiredMark() {
  return (
    <span className="ml-0.5 text-danger" aria-hidden="true">
      *
    </span>
  );
}

/* Optional-field note, appended to a label. */
export function OptionalNote({ children = "optional" }: { children?: React.ReactNode }) {
  return <span className="ml-1 font-normal text-fg-faint">({children})</span>;
}

/* Success state shared by the create and edit drawers. */
export function DrawerSuccess({ title, body, onDone }: { title: string; body: string; onDone: () => void }) {
  return (
    <div className="veil-in flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center" role="status">
      <div className="flex size-11 items-center justify-center rounded-full border border-ok/25 bg-ok/10 text-ok">
        <svg width="18" height="18" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div className="text-[16px] font-semibold text-fg">{title}</div>
        <p className="mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
      </div>
      <button type="button" onClick={onDone} className="btn btn-primary mt-2 min-w-[120px]">
        Done
      </button>
    </div>
  );
}

export function ListAgentDrawer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    privacyTier: "confidential" as PrivacyTier,
    maxPerRequest: "",
    maxPerDay: "",
    initialFunding: "",
    allowedDomains: "",
    webhookUrl: "",
  });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdHandle, setCreatedHandle] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitStatus("submitting");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const maxPerRequest = parseFloat(form.maxPerRequest);
      const maxPerDay = parseFloat(form.maxPerDay);
      if (!Number.isFinite(maxPerRequest) || maxPerRequest < 0) {
        throw new Error("Enter a valid max per request amount.");
      }
      if (!Number.isFinite(maxPerDay) || maxPerDay < 0) {
        throw new Error("Enter a valid max per day amount.");
      }

      const allowedDomains = form.allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const initialFunding = form.initialFunding ? parseFloat(form.initialFunding) : 0;

      const { data, error } = await supabase.rpc("create_agent_account", {
        p_name: form.name,
        p_description: form.description || null,
        p_privacy_tier: form.privacyTier,
        p_max_per_request: maxPerRequest,
        p_max_per_day: maxPerDay,
        p_initial_funding: Number.isFinite(initialFunding) ? initialFunding : 0,
        p_allowed_domains: allowedDomains,
        p_webhook_url: form.webhookUrl || null,
      });

      if (error) throw new Error(error.message);
      setCreatedHandle(data?.handle ?? "");
      setSubmitStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setSubmitStatus("error");
    }
  }

  if (submitStatus === "success") {
    return (
      <DrawerSuccess
        title="Agent account created"
        body={createdHandle ? `${createdHandle}.veiled is active and ready to spend under its policy.` : "Your agent account is active and ready to spend under its policy."}
        onDone={onClose}
      />
    );
  }

  const submitting = submitStatus === "submitting";

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
        {submitStatus === "error" && <Notice tone="danger">{errorMsg}</Notice>}

        <div>
          <label className="field-label" htmlFor="la-name">Account name<RequiredMark /></label>
          <input id="la-name" className="input" required value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. my-data-agent" disabled={submitting} />
        </div>

        <div>
          <label className="field-label" htmlFor="la-description">Description<RequiredMark /></label>
          <textarea id="la-description" className="input resize-y" required value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="What does this agent do? What does it pay for?"
            disabled={submitting} rows={4} />
        </div>

        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label className="field-label" htmlFor="la-tier">Privacy tier</label>
              <select id="la-tier" className="input cursor-pointer" value={form.privacyTier} onChange={e => set("privacyTier", e.target.value as PrivacyTier)}
                disabled={submitting}>
                {PRIVACY_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="la-funding">Initial funding (USDG)<OptionalNote /></label>
              <input id="la-funding" className="input t-num" type="number" min="0" step="0.01" inputMode="decimal"
                value={form.initialFunding} onChange={e => set("initialFunding", e.target.value)}
                placeholder="e.g. 100" disabled={submitting} />
            </div>
          </div>
          <p className="field-hint">Debited from your primary account and credited to this agent account immediately.</p>
        </div>

        <fieldset className="border-t border-line pt-4">
          <legend className="sr-only">Spending policy</legend>
          <div className="mb-3 text-[13px] font-medium text-fg">Spending policy</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label className="field-label" htmlFor="la-max-req">Max per request (USDG)<RequiredMark /></label>
              <input id="la-max-req" className="input t-num" required type="number" min="0" step="0.01" inputMode="decimal"
                value={form.maxPerRequest} onChange={e => set("maxPerRequest", e.target.value)}
                placeholder="e.g. 0.10" disabled={submitting} />
            </div>
            <div>
              <label className="field-label" htmlFor="la-max-day">Max per day (USDG)<RequiredMark /></label>
              <input id="la-max-day" className="input t-num" required type="number" min="0" step="0.01" inputMode="decimal"
                value={form.maxPerDay} onChange={e => set("maxPerDay", e.target.value)}
                placeholder="e.g. 50.00" disabled={submitting} />
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="la-domains">Allowed domains<OptionalNote /></label>
            <input id="la-domains" className="input" value={form.allowedDomains} onChange={e => set("allowedDomains", e.target.value)}
              placeholder="api.datavendor.com, api.othervendor.com"
              disabled={submitting} />
            <p className="field-hint">Comma-separated. Leave empty to allow any domain.</p>
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="la-webhook">Webhook URL<OptionalNote /></label>
            <input id="la-webhook" className="input" value={form.webhookUrl} onChange={e => set("webhookUrl", e.target.value)}
              placeholder="https://your-service.com/webhooks/veiled"
              disabled={submitting} />
            <p className="field-hint">Receives payment notifications.</p>
          </div>
        </fieldset>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
        <button type="submit" disabled={submitting} aria-busy={submitting} className="btn btn-primary w-full sm:w-auto">
          {submitting ? "Creating…" : "Create agent account"}
        </button>
      </div>
    </form>
  );
}

export function ListAgentDrawerShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-labelledby="agent-drawer-title">
      <div onClick={onClose} className="absolute inset-0 bg-[rgba(3,5,9,0.6)] backdrop-blur-[3px]" />
      <div className="glass-strong border-gradient veil-in absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col rounded-none sm:rounded-l-[20px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id="agent-drawer-title" className="text-[17px] font-semibold tracking-[-0.01em] text-fg">Create agent account</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">
              Provision a new agent account with a spending policy.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-icon -mr-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
