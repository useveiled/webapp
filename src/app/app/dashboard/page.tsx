"use client";

import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  Database as RawDatabase,
  Account,
  SpendPolicy,
  AccountStatus,
  Transaction,
} from "@/lib/supabase/database.types";
import { ListAgentDrawer, ListAgentDrawerShell, RequiredMark, OptionalNote, DrawerSuccess } from "@/components/ListAgentDrawer";
import { Page, PageHeader, Panel, PanelHeader, Stat, EmptyState, Notice, Dialog } from "@/components/app/ui";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// database.types.ts's `Relationships` arrays are empty (this project doesn't
// use the Supabase CLI to generate them), so a nested embed like
// `accounts.select("*, spend_policies(*)")` types the embedded field as a
// `SelectQueryError` even though PostgREST resolves the real foreign key at
// runtime just fine. This re-declares the one relationship this page needs,
// locally, without touching the shared types file.
// ---------------------------------------------------------------------------
type SpendPolicyRelationships = [
  {
    foreignKeyName: "spend_policies_account_id_fkey";
    columns: ["account_id"];
    isOneToOne: true;
    referencedRelation: "accounts";
    referencedColumns: ["id"];
  }
];
type TableRelOverrides = { spend_policies: SpendPolicyRelationships };
type WithRelationships<T> = {
  [K in keyof T]: Omit<T[K], "Relationships"> & {
    Relationships: K extends keyof TableRelOverrides ? TableRelOverrides[K] : [];
  };
};
type FixedDatabase = {
  public: {
    Tables: WithRelationships<RawDatabase["public"]["Tables"]>;
    Views: WithRelationships<RawDatabase["public"]["Views"]>;
    Functions: RawDatabase["public"]["Functions"];
  };
};

function db(): SupabaseClient<FixedDatabase> {
  return createClient() as unknown as SupabaseClient<FixedDatabase>;
}

type AgentAccount = Account & { spend_policies: SpendPolicy | null };

const TAB_LABELS: Record<"overview" | "agents" | "payouts", string> = {
  overview: "Overview",
  agents: "Agent accounts",
  payouts: "Settlements",
};

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "payouts">("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentAccount | null>(null);
  const [revokeAgent, setRevokeAgent] = useState<AgentAccount | null>(null);
  const [agents, setAgents] = useState<AgentAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = db();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAgents([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { data: agentData, error: agentError } = await supabase
      .from("accounts")
      .select("*, spend_policies(*)")
      .eq("owner_id", user.id)
      .eq("type", "agent")
      .order("created_at", { ascending: false });

    if (agentError) {
      setLoadError(agentError.message);
      setAgents([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    const agentRows = agentData ?? [];
    setAgents(agentRows);

    const agentIds = agentRows.map((a) => a.id);
    if (agentIds.length > 0) {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .in("from_account_id", agentIds)
        .order("created_at", { ascending: false });

      if (txError) {
        setLoadError(txError.message);
        setTransactions([]);
      } else {
        setTransactions(txData ?? []);
      }
    } else {
      setTransactions([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  async function handleStatusChange(agentId: string, newStatus: "active" | "paused") {
    setActionError(null);
    setBusyId(agentId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("set_agent_status", { p_account_id: agentId, p_status: newStatus });
    setBusyId(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (data) {
      setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, ...data } : a)));
    }
  }

  async function handleRevoke(agent: AgentAccount) {
    setActionError(null);
    setBusyId(agent.id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("revoke_agent_account", { p_account_id: agent.id });
    setBusyId(null);
    setRevokeAgent(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (data) {
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, ...data } : a)));
    }
  }

  const totalBalance = agents.reduce((s, a) => s + a.balance, 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const settledTxs = transactions.filter((t) => t.status === "settled");
  const totalSettled = settledTxs.reduce((s, t) => s + t.amount, 0);
  const totalPayments = settledTxs.length;

  function onDrawerClose(refresh?: boolean) {
    setDrawerOpen(false);
    setEditAgent(null);
    if (refresh) fetchAgents();
  }

  const activeList = agents.filter((a) => a.status === "active");
  const kpis = [
    { label: "Total balance", value: formatUsd(totalBalance) },
    { label: "Active agent accounts", value: String(activeAgents) },
    { label: "Settled (all-time)", value: formatUsd(totalSettled) },
    { label: "Total payments", value: totalPayments.toLocaleString() },
  ];

  return (
    <Page>
      <PageHeader
        title="Agent Accounts"
        description={loading ? "Loading…" : `${activeAgents} active agent account${activeAgents !== 1 ? "s" : ""} under policy`}
        actions={
          <button type="button" onClick={() => setDrawerOpen(true)} className="btn btn-primary">
            <span aria-hidden="true" className="-ml-0.5 text-[16px] leading-none">+</span>
            Create agent account
          </button>
        }
      />

      {(loadError || actionError) && (
        <div className="mb-5 flex flex-col gap-2">
          {loadError && <Notice tone="danger">{loadError}</Notice>}
          {actionError && <Notice tone="danger">{actionError}</Notice>}
        </div>
      )}

      {/* KPIs */}
      <Panel padded={false} className="mb-6 grid grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Stat
            key={kpi.label}
            label={kpi.label}
            value={loading ? <span className="skeleton inline-block h-6 w-20 align-middle" aria-label="Loading" /> : kpi.value}
            className={cn(
              "px-4 py-4 sm:px-5",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l"
            )}
          />
        ))}
      </Panel>

      {/* Tabs */}
      <div className="segmented mb-4 max-w-full overflow-x-auto" role="tablist" aria-label="Agent account views">
        {(["overview", "agents", "payouts"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="shrink-0"
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <Panel padded={false} className="overflow-hidden">
          <PanelHeader title="Your agent accounts" description="Active accounts and what they have settled." className="mb-0 border-b border-line px-5 py-4" />
          {loading ? (
            <RowsSkeleton />
          ) : activeList.length === 0 ? (
            <EmptyState
              title="No active agent accounts yet"
              description="Create an agent account to give it a balance and a spending policy."
              action={
                <button type="button" onClick={() => setDrawerOpen(true)} className="btn btn-secondary">
                  Create agent account
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Agent</th>
                    <th scope="col" className="!text-right">Payments</th>
                    <th scope="col" className="!text-right">Settled</th>
                    <th scope="col" className="!text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((agent) => {
                    const agentTxs = settledTxs.filter((t) => t.from_account_id === agent.id);
                    const agentSettled = agentTxs.reduce((s, t) => s + t.amount, 0);
                    return (
                      <tr key={agent.id}>
                        <td className="min-w-[180px]">
                          <div className="font-medium text-fg">{agent.name}</div>
                          <div className="t-num mt-0.5 text-[12.5px] text-fg-muted">
                            {agent.spend_policies ? `${formatUsd(agent.spend_policies.max_per_request)} max per request` : "n/a"}
                          </div>
                        </td>
                        <td className="t-num text-right">{agentTxs.length.toLocaleString()}</td>
                        <td className="t-num text-right text-fg">{formatUsd(agentSettled)}</td>
                        <td className="t-num text-right text-fg">{formatUsd(agent.balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "agents" && (
        <Panel padded={false} className="overflow-hidden">
          {loading ? (
            <RowsSkeleton />
          ) : agents.length === 0 ? (
            <EmptyState
              title="No agent accounts yet"
              description="Each agent account gets its own confidential balance and an on-chain spending policy."
              action={
                <button type="button" onClick={() => setDrawerOpen(true)} className="btn btn-secondary">
                  Create agent account
                </button>
              }
            />
          ) : (
            <ul className="divided">
              {agents.map((agent) => {
                const agentTxs = settledTxs.filter((t) => t.from_account_id === agent.id);
                const agentSettled = agentTxs.reduce((s, t) => s + t.amount, 0);
                const isBusy = busyId === agent.id;
                return (
                  <li
                    key={agent.id}
                    aria-busy={isBusy}
                    className={cn(
                      "flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:gap-6",
                      agent.status === "revoked" && "opacity-60"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-fg">{agent.name}</span>
                        <StatusBadge status={agent.status} />
                      </div>
                      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px] text-fg-muted">
                        <span className="t-mono truncate">{agent.handle}.veiled</span>
                        {agent.spend_policies && (
                          <>
                            <span aria-hidden="true" className="text-fg-faint">·</span>
                            <span className="t-num">{formatUsd(agent.spend_policies.max_per_request)} max per request</span>
                          </>
                        )}
                      </div>
                    </div>
                    {agent.status !== "revoked" && (
                      <div className="grid grid-cols-3 gap-4 md:flex md:gap-6">
                        <StatCell label="Payments" value={agentTxs.length.toLocaleString()} />
                        <StatCell label="Settled" value={formatUsd(agentSettled)} highlight />
                        <StatCell label="Balance" value={formatUsd(agent.balance)} green />
                      </div>
                    )}
                    {agent.status !== "revoked" && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button type="button" onClick={() => setEditAgent(agent)} disabled={isBusy} className="btn btn-secondary btn-sm">
                          Edit
                        </button>
                        {agent.status === "paused" && (
                          <button type="button" onClick={() => handleStatusChange(agent.id, "active")} disabled={isBusy} className="btn btn-ghost btn-sm">
                            {isBusy ? "…" : "Resume"}
                          </button>
                        )}
                        {agent.status === "active" && (
                          <button type="button" onClick={() => handleStatusChange(agent.id, "paused")} disabled={isBusy} className="btn btn-ghost btn-sm">
                            {isBusy ? "…" : "Pause"}
                          </button>
                        )}
                        <button type="button" onClick={() => setRevokeAgent(agent)} disabled={isBusy} className="btn btn-danger btn-sm">
                          Revoke
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      {activeTab === "payouts" && (
        <Panel padded={false} className="overflow-hidden">
          {loading ? (
            <RowsSkeleton />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="No settlements yet"
              description="Payments made from your agent accounts will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Payment</th>
                    <th scope="col">Time</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="!text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const agent = agents.find((a) => a.id === tx.from_account_id);
                    return (
                      <tr key={tx.id}>
                        <td className="min-w-[200px]">
                          <div className="text-fg">
                            {agent?.name ?? tx.from_display} <span aria-hidden="true" className="text-fg-faint">→</span>
                            <span className="sr-only">to</span> {tx.to_display}
                          </div>
                          {tx.memo && <div className="mt-0.5 text-[12.5px] text-fg-muted">{tx.memo}</div>}
                        </td>
                        <td className="t-num whitespace-nowrap text-[12.5px] text-fg-muted">{formatTimestamp(tx.created_at)}</td>
                        <td><TxStatusBadge status={tx.status} /></td>
                        <td className="t-num whitespace-nowrap text-right font-medium text-fg">{formatUsd(tx.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Create agent account drawer */}
      {drawerOpen && (
        <ListAgentDrawerShell onClose={() => onDrawerClose(false)}>
          <ListAgentDrawer onClose={() => onDrawerClose(true)} />
        </ListAgentDrawerShell>
      )}

      {/* Edit agent drawer */}
      {editAgent && (
        <ListAgentDrawerShell onClose={() => onDrawerClose(false)}>
          <EditAgentDrawer agent={editAgent} onClose={(refresh) => onDrawerClose(refresh)} />
        </ListAgentDrawerShell>
      )}

      {/* Revoke confirmation */}
      {revokeAgent && (
        <RevokeConfirmModal
          agent={revokeAgent}
          busy={busyId === revokeAgent.id}
          onCancel={() => setRevokeAgent(null)}
          onConfirm={() => handleRevoke(revokeAgent)}
        />
      )}
    </Page>
  );
}

function RowsSkeleton() {
  return (
    <div className="divided" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-1/4" />
          </div>
          <div className="skeleton hidden h-3.5 w-16 sm:block" />
          <div className="skeleton h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function RevokeConfirmModal({ agent, busy, onCancel, onConfirm }: { agent: AgentAccount; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog
      open
      onClose={busy ? () => {} : onCancel}
      title={`Revoke ${agent.name}?`}
      width={440}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy} className="btn btn-danger">
            {busy ? "Revoking…" : "Revoke permanently"}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-fg-body">
        This is permanent. <span className="t-mono text-fg">{agent.handle}.veiled</span> will no longer be able to receive or send payments, and its
        balance of <span className="t-num text-fg">{formatUsd(agent.balance)}</span> USDG will be swept back to your primary account. This cannot be undone.
      </p>
    </Dialog>
  );
}

function EditAgentDrawer({ agent, onClose }: { agent: AgentAccount; onClose: (refresh?: boolean) => void }) {
  const [form, setFormState] = useState({
    name: agent.name,
    description: agent.description ?? "",
    maxPerRequest: agent.spend_policies ? String(agent.spend_policies.max_per_request) : "0",
    maxPerDay: agent.spend_policies ? String(agent.spend_policies.max_per_day) : "0",
    allowedDomains: agent.spend_policies ? agent.spend_policies.allowed_domains.join(", ") : "",
    webhookUrl: agent.spend_policies?.webhook_url ?? "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof typeof form, value: string) {
    setFormState((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitStatus("submitting");
    setErrorMsg("");

    try {
      const supabase = createClient();

      const maxPerRequest = parseFloat(form.maxPerRequest);
      const maxPerDay = parseFloat(form.maxPerDay);
      if (!Number.isFinite(maxPerRequest) || maxPerRequest < 0) throw new Error("Enter a valid max per request amount.");
      if (!Number.isFinite(maxPerDay) || maxPerDay < 0) throw new Error("Enter a valid max per day amount.");

      const allowedDomains = form.allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      const { error: accountError } = await supabase
        .from("accounts")
        .update({ name: form.name, description: form.description || null })
        .eq("id", agent.id);
      if (accountError) throw new Error(accountError.message);

      const { error: policyError } = await supabase
        .from("spend_policies")
        .update({
          max_per_request: maxPerRequest,
          max_per_day: maxPerDay,
          allowed_domains: allowedDomains,
          webhook_url: form.webhookUrl || null,
        })
        .eq("account_id", agent.id);
      if (policyError) throw new Error(policyError.message);

      setSubmitStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setSubmitStatus("error");
    }
  }

  if (submitStatus === "success") {
    return (
      <DrawerSuccess
        title="Agent account updated"
        body="Your spending policy changes have been saved."
        onDone={() => onClose(true)}
      />
    );
  }

  const submitting = submitStatus === "submitting";

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
        {submitStatus === "error" && <Notice tone="danger">{errorMsg}</Notice>}

        <div>
          <label className="field-label" htmlFor="ea-name">Agent name<RequiredMark /></label>
          <input id="ea-name" className="input" required value={form.name} onChange={e => set("name", e.target.value)} disabled={submitting} />
        </div>

        <div>
          <label className="field-label" htmlFor="ea-description">Description</label>
          <textarea id="ea-description" className="input resize-y" value={form.description} onChange={e => set("description", e.target.value)} disabled={submitting} rows={4} />
        </div>

        <fieldset className="border-t border-line pt-4">
          <legend className="sr-only">Spending policy</legend>
          <div className="mb-3 text-[13px] font-medium text-fg">Spending policy</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div>
              <label className="field-label" htmlFor="ea-max-req">Max per request (USDG)<RequiredMark /></label>
              <input id="ea-max-req" className="input t-num" required type="number" min="0" step="0.01" inputMode="decimal" value={form.maxPerRequest} onChange={e => set("maxPerRequest", e.target.value)} disabled={submitting} />
            </div>
            <div>
              <label className="field-label" htmlFor="ea-max-day">Max per day (USDG)<RequiredMark /></label>
              <input id="ea-max-day" className="input t-num" required type="number" min="0" step="0.01" inputMode="decimal" value={form.maxPerDay} onChange={e => set("maxPerDay", e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="ea-domains">Allowed domains<OptionalNote /></label>
            <input id="ea-domains" className="input" value={form.allowedDomains} onChange={e => set("allowedDomains", e.target.value)} disabled={submitting} placeholder="api.datavendor.com, api.othervendor.com" />
            <p className="field-hint">Comma-separated. Leave empty to allow any domain.</p>
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="ea-webhook">Webhook URL<OptionalNote /></label>
            <input id="ea-webhook" className="input" value={form.webhookUrl} onChange={e => set("webhookUrl", e.target.value)} disabled={submitting} placeholder="https://your-service.com/webhooks/veiled" />
            <p className="field-hint">Receives payment notifications.</p>
          </div>
        </fieldset>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
        <button type="submit" disabled={submitting} aria-busy={submitting} className="btn btn-primary w-full sm:w-auto">
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function StatCell({ label, value, highlight, green }: { label: string; value: string; highlight?: boolean; green?: boolean }) {
  return (
    <div className="min-w-0 md:min-w-[84px]">
      <div className="text-[12px] text-fg-muted">{label}</div>
      <div className={cn("t-num mt-0.5 truncate text-[13.5px] font-medium", green || highlight ? "text-fg" : "text-fg-body")}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const cfg: Record<AccountStatus, { label: string; cls: string }> = {
    active: { label: "Active", cls: "badge-ok" },
    paused: { label: "Paused", cls: "badge-warn" },
    revoked: { label: "Revoked", cls: "badge-danger" },
  };
  const c = cfg[status];
  return (
    <span className={cn("badge", c.cls)}>
      <span className="dot" />
      {c.label}
    </span>
  );
}

function TxStatusBadge({ status }: { status: Transaction["status"] }) {
  const cfg: Record<Transaction["status"], string> = {
    settled: "badge-ok",
    pending: "badge-warn",
    failed: "badge-danger",
  };
  return (
    <span className={cn("badge", cfg[status])}>
      <span className="dot" />
      {capitalize(status)}
    </span>
  );
}
