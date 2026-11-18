"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database as RawDatabase, Transaction, TransactionStatus, PrivacyLayer } from "@/lib/supabase/database.types";
import { Page, PageHeader, Panel, Stat, EmptyState, Notice } from "@/components/app/ui";
import { cn } from "@/lib/utils";

type TxStatus = TransactionStatus;

type Direction = "in" | "out";

// database.types.ts's Tables/Views entries don't carry a `Relationships` array,
// which recent @supabase/supabase-js versions require for the schema generic to
// resolve (otherwise every `.from()`/`.rpc()` call silently types as `never`).
// This re-shapes the schema locally, for this file only, without touching the
// shared types file or client factory.
type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } };
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

const STATUS_CFG: Record<TxStatus, { label: string; badge: string }> = {
  settled: { label: "Settled", badge: "badge-ok" },
  pending: { label: "Pending", badge: "badge-warn" },
  failed: { label: "Failed", badge: "badge-danger" },
};

function StatusBadge({ status }: { status: TxStatus }) {
  const sc = STATUS_CFG[status];
  return (
    <span className={cn("badge", sc.badge)}>
      <span className="dot" aria-hidden="true" />
      {sc.label}
    </span>
  );
}

function PrivacyBadge({ layer }: { layer: PrivacyLayer }) {
  return <span className="badge">{layer}</span>;
}

function shortSig(sig: string) {
  return sig.length > 14 ? `${sig.slice(0, 6)}…${sig.slice(-6)}` : sig;
}


function formatTimestamp(iso: string | null) {
  if (!iso) return "n/a";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datePart} · ${timePart}`;
}

function formatFinality(ms: number | null) {
  return ms == null ? "n/a" : `${ms}ms`;
}

export default function ExecutionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ownedAccountIds, setOwnedAccountIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filter, setFilter] = useState<TxStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [disclosureDetailOpen, setDisclosureDetailOpen] = useState<Set<string>>(new Set());
  const [disclosureLoading, setDisclosureLoading] = useState<string | null>(null);
  const [disclosureError, setDisclosureError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setLoadError(null);
    const supabase = db();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTransactions([]);
      setOwnedAccountIds(new Set());
      setLoading(false);
      return;
    }

    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_id", user.id);

    if (accountsError) {
      setLoadError(accountsError.message);
      setLoading(false);
      return;
    }

    const ownedIds = new Set((accountsData ?? []).map((a) => a.id));
    setOwnedAccountIds(ownedIds);

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (txError) {
      setLoadError(txError.message);
      setLoading(false);
      return;
    }

    setTransactions(txData ?? []);
    setLoading(false);
  }

  function directionOf(tx: Transaction): Direction {
    const fromOwned = tx.from_account_id != null && ownedAccountIds.has(tx.from_account_id);
    const toOwned = tx.to_account_id != null && ownedAccountIds.has(tx.to_account_id);
    if (fromOwned) return "out";
    if (toOwned) return "in";
    return "out";
  }

  function isInternal(tx: Transaction) {
    const fromOwned = tx.from_account_id != null && ownedAccountIds.has(tx.from_account_id);
    const toOwned = tx.to_account_id != null && ownedAccountIds.has(tx.to_account_id);
    return fromOwned && toOwned;
  }

  function counterpartyOf(tx: Transaction) {
    return directionOf(tx) === "out" ? tx.to_display : tx.from_display;
  }

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.status === filter);
  const selectedTx = selected ? transactions.find((t) => t.id === selected) ?? null : null;

  const totalVolume = transactions.filter((t) => t.status === "settled").reduce((s, t) => s + t.amount, 0);

  function toggleReveal(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatAmount(tx: Transaction) {
    if (tx.privacy_layer === "Public" || revealed.has(tx.id)) {
      return `$${tx.amount.toFixed(2)}`;
    }
    return "••••• USDG";
  }

  async function handleGenerateDisclosure(tx: Transaction) {
    setDisclosureLoading(tx.id);
    setDisclosureError(null);
    try {
      const supabase = db();
      const { data, error } = await supabase.rpc("generate_disclosure", { p_transaction_id: tx.id });
      if (error) throw new Error(error.message);
      if (data) {
        setTransactions((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      }
    } catch (err) {
      setDisclosureError(err instanceof Error ? err.message : "Failed to generate compliance disclosure");
    } finally {
      setDisclosureLoading(null);
    }
  }

  function toggleDisclosureDetail(id: string) {
    setDisclosureDetailOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectTx(id: string) {
    setSelected((prev) => (prev === id ? null : id));
    setDisclosureError(null);
  }

  const settledCount = transactions.filter((t) => t.status === "settled").length;
  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const failedCount = transactions.filter((t) => t.status === "failed").length;

  const summary = [
    { label: "Settled", value: settledCount },
    { label: "Pending", value: pendingCount },
    { label: "Failed", value: failedCount },
    { label: "Settled volume", value: `$${totalVolume.toFixed(2)}` },
  ];

  return (
    <Page>
      <PageHeader
        title="Activity"
        description={
          loading
            ? "Loading transactions…"
            : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""} · $${totalVolume.toFixed(2)} settled volume · amounts confidential by default, verified on Solana`
        }
      />

      {loadError && (
        <Notice tone="danger" className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span>{loadError}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchData()}>
            Retry
          </button>
        </Notice>
      )}

      {/* Summary */}
      <Panel padded={false} className="mb-5 grid grid-cols-2 lg:grid-cols-4">
        {summary.map((s, i) => (
          <Stat
            key={s.label}
            label={s.label}
            value={loading ? <span className="skeleton inline-block h-6 w-16 align-middle" /> : s.value}
            className={cn(
              "px-5 py-4 border-line",
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          />
        ))}
      </Panel>

      {/* Filters */}
      <div className="mb-4 flex max-w-full overflow-x-auto">
        <div className="segmented" role="group" aria-label="Filter by status">
          {(["all", "settled", "pending", "failed"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="capitalize">
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid items-start gap-4", selectedTx && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        {/* Feed */}
        <Panel padded={false} className="min-w-0 overflow-hidden">
          {!loading && filtered.length === 0 ? (
            <EmptyState
              title={filter === "all" ? "No transactions yet" : `No ${filter} transactions`}
              description={
                filter === "all"
                  ? "Transfers to and from your accounts will appear here."
                  : "Nothing matches this filter."
              }
              action={
                filter !== "all" ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilter("all")}>
                    Show all
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Counterparty</th>
                    <th scope="col">Privacy</th>
                    <th scope="col" className="!text-right">Amount</th>
                    <th scope="col">Signature</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} aria-hidden="true">
                        <td><span className="skeleton block h-5 w-16" /></td>
                        <td><span className="skeleton block h-4 w-40" /><span className="skeleton mt-1.5 block h-3 w-24" /></td>
                        <td><span className="skeleton block h-5 w-20" /></td>
                        <td><span className="skeleton ml-auto block h-4 w-20" /></td>
                        <td><span className="skeleton block h-4 w-24" /></td>
                        <td><span className="skeleton block h-4 w-28" /></td>
                      </tr>
                    ))}

                  {!loading &&
                    filtered.map((tx) => {
                      const isSelected = selected === tx.id;
                      const direction = directionOf(tx);
                      const counterparty = counterpartyOf(tx);
                      const internal = isInternal(tx);
                      const hidden = tx.privacy_layer !== "Public" && !revealed.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => selectTx(tx.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              selectTx(tx.id);
                            }
                          }}
                          tabIndex={0}
                          aria-selected={isSelected}
                          className={cn("cursor-pointer focus-visible:outline-offset-[-2px]", isSelected && "!bg-signal/[0.07]")}
                        >
                          <td><StatusBadge status={tx.status} /></td>

                          <td className="max-w-[280px]">
                            <div
                              className={cn(
                                "truncate text-[13.5px] text-fg",
                                tx.counterparty_type !== "human" && "t-mono text-[13px]",
                              )}
                            >
                              <span className="text-fg-faint" aria-hidden="true">{direction === "out" ? "→ " : "← "}</span>
                              <span className="sr-only">{direction === "out" ? "To " : "From "}</span>
                              {counterparty}
                            </div>
                            <div className="mt-0.5 truncate text-[12.5px] text-fg-muted">
                              {tx.memo ?? "n/a"}
                              {internal ? " · internal transfer" : ""}
                            </div>
                          </td>

                          <td><PrivacyBadge layer={tx.privacy_layer} /></td>

                          <td className="whitespace-nowrap text-right">
                            {tx.privacy_layer !== "Public" ? (
                              <button
                                type="button"
                                onClick={(e) => toggleReveal(tx.id, e)}
                                title={hidden ? "Click to reveal" : "Click to hide"}
                                aria-label={hidden ? "Reveal amount" : `Hide amount, ${formatAmount(tx)}`}
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[13px] transition-colors hover:bg-white/[0.05]",
                                  hidden ? "cipher" : "t-mono t-num font-medium text-fg",
                                )}
                              >
                                {formatAmount(tx)}
                              </button>
                            ) : (
                              <span className="t-mono t-num px-1.5 text-[13px] font-medium text-fg">{formatAmount(tx)}</span>
                            )}
                          </td>

                          <td className="whitespace-nowrap">
                            {tx.tx_sig != null ? (
                              <span className="t-mono text-[12.5px] text-fg-muted" title={tx.tx_sig}>
                                {shortSig(tx.tx_sig)}
                              </span>
                            ) : (
                              <span className="text-fg-faint">n/a</span>
                            )}
                          </td>

                          <td className="whitespace-nowrap">
                            <div className="t-mono t-num text-[12.5px] text-fg-body">{formatTimestamp(tx.created_at)}</div>
                            <div className="t-mono t-num mt-0.5 text-[12px] text-fg-faint">
                              {tx.id.slice(0, 8)} · {formatFinality(tx.finality_ms)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Receipt */}
        {selectedTx && (() => {
          const direction = directionOf(selectedTx);
          const counterparty = counterpartyOf(selectedTx);
          const detailOpen = disclosureDetailOpen.has(selectedTx.id);
          const isGeneratingThis = disclosureLoading === selectedTx.id;

          return (
            <Panel padded={false} className="veil-in min-w-0 lg:sticky lg:top-6">
              <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 pl-5 pr-3">
                <h2 className="text-[14px] font-semibold text-fg">Transaction receipt</h2>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close receipt" className="btn btn-ghost btn-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={selectedTx.status} />
                  <PrivacyBadge layer={selectedTx.privacy_layer} />
                </div>

                <dl className="flex flex-col gap-3">
                  {[
                    { label: "Transaction ID", value: selectedTx.id, mono: true },
                    { label: "Counterparty", value: `${direction === "out" ? "To" : "From"} ${counterparty}${isInternal(selectedTx) ? " (internal transfer)" : ""}` },
                    { label: "Timestamp", value: formatTimestamp(selectedTx.created_at), mono: true },
                    { label: "Finality", value: formatFinality(selectedTx.finality_ms), mono: true },
                    { label: "Amount", value: `$${selectedTx.amount.toFixed(2)} USDG`, mono: true },
                    { label: "Memo", value: selectedTx.memo ?? "n/a" },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[12.5px] text-fg-muted">{label}</dt>
                      <dd className={cn("mt-0.5 break-words text-[13.5px] text-fg", mono && "t-mono t-num text-[13px] break-all")}>
                        {value}
                      </dd>
                    </div>
                  ))}

                  <div className="min-w-0">
                    <dt className="text-[12.5px] text-fg-muted">Transaction signature</dt>
                    <dd className={cn("t-mono mt-0.5 break-all text-[12.5px]", selectedTx.tx_sig != null ? "text-fg-body" : "text-fg-faint")}>
                      {selectedTx.tx_sig ?? "n/a"}
                    </dd>
                  </div>
                </dl>

                {selectedTx.proof_hash != null && (
                  <div className="well px-3 py-2.5">
                    <div className="text-[12.5px] text-fg-muted">ZK proof hash (Solana)</div>
                    <div className="t-mono mt-1 break-all text-[12px] leading-[1.55] text-fg-body">{selectedTx.proof_hash}</div>
                  </div>
                )}

                {selectedTx.status === "settled" && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm w-full"
                      onClick={() => {
                        if (selectedTx.disclosed) toggleDisclosureDetail(selectedTx.id);
                        else handleGenerateDisclosure(selectedTx);
                      }}
                      disabled={isGeneratingThis}
                      aria-expanded={selectedTx.disclosed ? detailOpen : undefined}
                    >
                      {isGeneratingThis
                        ? "Generating…"
                        : selectedTx.disclosed
                          ? (detailOpen ? "Hide compliance disclosure" : "View compliance disclosure")
                          : "Generate compliance disclosure"}
                    </button>

                    {disclosureError && <Notice tone="danger" className="text-[13px]">{disclosureError}</Notice>}

                    {selectedTx.disclosed && detailOpen && (
                      <div className="well px-3 py-2.5 text-[13px] leading-relaxed text-fg-body">
                        Disclosed {formatTimestamp(selectedTx.disclosed_at)}. A view key for this transaction&apos;s full proof and settlement details has been generated for compliance review.
                      </div>
                    )}
                  </div>
                )}

                {selectedTx.status === "pending" && (
                  <Notice tone="warn" className="text-[13px]">
                    Awaiting on-chain confirmation of the ZK range proof. Balance will update once the validator finalizes the block.
                  </Notice>
                )}

                {selectedTx.status === "failed" && (
                  <Notice tone="danger" className="text-[13px]">
                    This transaction did not settle. No balance was moved.
                  </Notice>
                )}
              </div>
            </Panel>
          );
        })()}
      </div>
    </Page>
  );
}
