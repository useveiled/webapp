"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Account, Profile, Transaction } from "@/lib/supabase/database.types";
import Link from "next/link";
import { Page, PageHeader, Panel, EmptyState, Notice } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const TOPUP_PRESETS = ["10", "25", "50", "100"];
const DEPOSIT_ADDRESS = process.env.NEXT_PUBLIC_DEPOSIT_ADDRESS ?? "";

type TopUpStep = "amount" | "deposit" | "verifying" | "success";

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spentThisMonth, setSpentThisMonth] = useState<number | null>(null);
  const [totalToppedUp, setTotalToppedUp] = useState<number | null>(null);

  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("50");
  const [topUpStep, setTopUpStep] = useState<TopUpStep>("amount");
  const [topUpStatus, setTopUpStatus] = useState<"idle" | "error">("idle");
  const [topUpError, setTopUpError] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    };
  }, []);

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: profileData }, { data: accountData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
      supabase.from("accounts").select("*").eq("owner_id", user.id).eq("is_primary", true).single<Account>(),
    ]);

    setProfile(profileData ?? null);
    setAccount(accountData ?? null);

    if (accountData) {
      const primaryId = accountData.id;
      const [{ data: txData }, { data: spentData }, { data: toppedUpData }] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .or(`from_account_id.eq.${primaryId},to_account_id.eq.${primaryId}`)
          .order("created_at", { ascending: false })
          .limit(50)
          .returns<Transaction[]>(),
        supabase
          .from("transactions")
          .select("amount")
          .eq("from_account_id", primaryId)
          .eq("status", "settled")
          .gte("created_at", startOfCurrentMonthIso())
          .returns<{ amount: number }[]>(),
        supabase
          .from("transactions")
          .select("amount")
          .eq("to_account_id", primaryId)
          .eq("counterparty_type", "external")
          .returns<{ amount: number }[]>(),
      ]);

      setTransactions(txData ?? []);
      setSpentThisMonth((spentData ?? []).reduce((sum, row) => sum + Number(row.amount), 0));
      setTotalToppedUp((toppedUpData ?? []).reduce((sum, row) => sum + Number(row.amount), 0));
    } else {
      setTransactions([]);
      setSpentThisMonth(null);
      setTotalToppedUp(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const avgSettlementMs = useMemo(() => {
    const settled = transactions.filter((t) => t.status === "settled" && t.finality_ms != null);
    if (settled.length === 0) return null;
    const total = settled.reduce((sum, t) => sum + (t.finality_ms ?? 0), 0);
    return Math.round(total / settled.length);
  }, [transactions]);

  function resetTopUp() {
    setShowTopUp(false);
    setTopUpStep("amount");
    setTopUpStatus("idle");
    setTopUpError("");
    setDepositAddress("");
    setCopyStatus("idle");
  }

  function handleContinueToDeposit() {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setTopUpStatus("error");
      setTopUpError("Enter an amount greater than zero.");
      return;
    }
    setTopUpStatus("idle");
    setTopUpError("");
    setDepositAddress(DEPOSIT_ADDRESS);
    setTopUpStep("deposit");
  }

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch {
      // clipboard API unavailable, nothing more we can do here
    }
  }

  function handleConfirmTransferred() {
    setTopUpStep("verifying");
    const delayMs = 5000 + Math.random() * 5000;
    verifyTimerRef.current = setTimeout(async () => {
      if (!account) return;
      const parsed = parseFloat(amount);
      const supabase = createClient();
      const { error } = await supabase.rpc("simulate_topup", {
        p_account_id: account.id,
        p_amount: parsed,
      });

      if (error) {
        setTopUpStatus("error");
        setTopUpError(error.message);
        setTopUpStep("amount");
        return;
      }

      setTopUpStep("success");
      await fetchWalletData();
    }, delayMs);
  }

  const stats = [
    { label: "Spent this month", value: loading ? "…" : spentThisMonth != null ? formatUsd(spentThisMonth) : "n/a" },
    { label: "Total topped up", value: loading ? "…" : totalToppedUp != null ? formatUsd(totalToppedUp) : "n/a" },
    { label: "Avg settlement time", value: loading ? "…" : avgSettlementMs != null ? `${avgSettlementMs}ms` : "n/a" },
  ];


  return (
    <Page>
      <PageHeader title="Wallet" description="Your USDG balance and transaction history." />

      <div className="flex flex-col gap-5">
        {/* Balance + stats */}
        <Panel padded={false}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[13px] text-fg-muted">Available balance</div>
              {loading ? (
                <div className="skeleton mt-2 h-9 w-48" aria-label="Loading balance" />
              ) : (
                <div className="t-mono t-num mt-1 text-[34px] font-semibold leading-tight tracking-[-0.02em] text-fg">
                  {account ? account.balance.toFixed(2) : "n/a"} <span className="text-[16px] font-normal text-fg-muted">USDG</span>
                </div>
              )}
              <div className="mt-1.5 text-[13px] text-fg-muted">
                {loading ? (
                  <span className="skeleton inline-block h-3.5 w-40 align-middle" />
                ) : profile?.wallet_address ? (
                  <>
                    <span className="t-mono text-fg-body">{truncateAddress(profile.wallet_address)}</span> · Solana wallet
                  </>
                ) : (
                  "No wallet linked, add one in Settings"
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={loading || !account}
              aria-expanded={showTopUp}
              className={cn("btn self-start sm:self-auto", showTopUp ? "btn-secondary" : "btn-primary")}
            >
              Top up
            </button>
          </div>

          <dl className="grid grid-cols-1 border-t border-line sm:grid-cols-3">
            {stats.map((s, i) => (
              <div key={s.label} className={cn("min-w-0 px-5 py-4", i > 0 && "border-t border-line sm:border-l sm:border-t-0")}>
                <dt className="text-[12.5px] text-fg-muted">{s.label}</dt>
                <dd className="t-mono t-num mt-1 truncate text-[18px] font-semibold tracking-[-0.01em] text-fg">
                  {loading ? <span className="skeleton block h-6 w-20" aria-label="Loading" /> : s.value}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* Top-up flow */}
        {showTopUp && (
          <Panel className="veil-in">
            {topUpStep === "amount" && (
              <>
                <h2 className="mb-3 text-[15px] font-semibold text-fg">Add USDG</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="segmented" role="group" aria-label="Preset amounts">
                    {TOPUP_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={amount === v}
                        onClick={() => { setAmount(v); setTopUpStatus("idle"); setTopUpError(""); }}
                        className="t-num"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="topup-amount" className="sr-only">
                    Custom amount
                  </label>
                  <input
                    id="topup-amount"
                    type="number"
                    inputMode="decimal"
                    className="input t-mono t-num sm:flex-1"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setTopUpStatus("idle"); setTopUpError(""); }}
                    placeholder="Custom"
                    aria-invalid={topUpStatus === "error" || undefined}
                  />
                </div>
                {topUpStatus === "error" && (
                  <Notice tone="danger" className="mt-3">
                    {topUpError || "n/a"}
                  </Notice>
                )}
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={handleContinueToDeposit} disabled={!account} className="btn btn-primary w-full sm:w-auto">
                    Continue
                  </button>
                </div>
              </>
            )}

            {topUpStep === "deposit" && (
              <>
                <h2 className="text-[15px] font-semibold text-fg">Send ${amount || "0"} USDG to this address</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">
                  Send from any Solana wallet, like Phantom, Solflare, or Backpack. Once your transfer is on its way, confirm below and
                  we&apos;ll verify it.
                </p>
                <div className="well mt-4 flex items-center gap-3 px-3.5 py-2.5">
                  <span className="t-mono min-w-0 flex-1 break-all text-[13px] text-fg-body">{depositAddress || "n/a"}</span>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="btn btn-secondary btn-sm shrink-0"
                    aria-label={copyStatus === "copied" ? "Address copied" : "Copy deposit address"}
                  >
                    {copyStatus === "copied" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setTopUpStep("amount")} className="btn btn-ghost">
                    Back
                  </button>
                  <button type="button" onClick={handleConfirmTransferred} className="btn btn-primary">
                    I&apos;ve transferred
                  </button>
                </div>
              </>
            )}

            {topUpStep === "verifying" && (
              <div className="flex items-center gap-3.5 py-2" role="status" aria-live="polite">
                <span
                  aria-hidden="true"
                  className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-signal border-t-transparent"
                />
                <div>
                  <div className="text-[14px] font-medium text-fg">Verifying transaction</div>
                  <p className="mt-0.5 text-[13px] text-fg-muted">
                    Confirming your deposit of ${amount || "0"} USDG on Solana. This usually takes a few seconds.
                  </p>
                </div>
              </div>
            )}

            {topUpStep === "success" && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" role="status">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-fg">Top up complete</div>
                    <p className="mt-0.5 text-[13px] text-fg-muted">${amount || "0"} USDG has been added to your account.</p>
                  </div>
                </div>
                <button type="button" onClick={resetTopUp} className="btn btn-primary self-start sm:self-auto">
                  Done
                </button>
              </div>
            )}
          </Panel>
        )}

        {/* Transaction history */}
        <Panel padded={false}>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Transaction history</h2>
          </div>
          {loading ? (
            <div className="divided" aria-busy="true" aria-label="Loading transactions">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="skeleton h-8 w-8 shrink-0" />
                  <div className="flex-1">
                    <div className="skeleton h-3.5 w-2/5" />
                    <div className="skeleton mt-2 h-3 w-1/4" />
                  </div>
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !account || transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Payments you send and receive from your primary account will appear here."
              action={
                <Link href="/app/run" className="btn btn-secondary btn-sm">
                  Send a payment
                </Link>
              }
            />
          ) : (
            <ul className="divided">
              {transactions.map((tx) => {
                const isCredit = tx.to_account_id === account.id;
                const shownAmount = isCredit ? tx.amount : -tx.amount;
                const counterpartyLabel = isCredit ? tx.from_display : tx.to_display;
                const description = tx.memo ? `${counterpartyLabel} · ${tx.memo}` : counterpartyLabel;

                return (
                  <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border",
                          isCredit ? "border-ok/20 bg-ok/10 text-ok" : "border-line bg-white/[0.03] text-fg-muted",
                        )}
                        aria-label={isCredit ? "Received" : "Sent"}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          {isCredit ? (
                            <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] text-fg">{description || "n/a"}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-fg-muted">
                          <span className="t-num">{formatTimestamp(tx.created_at)}</span>
                          {tx.status !== "settled" && (
                            <span className={cn("badge capitalize", tx.status === "failed" ? "badge-danger" : "badge-warn")}>
                              {tx.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={cn("t-mono t-num shrink-0 text-right text-[13.5px] font-medium", isCredit ? "text-ok" : "text-fg")}>
                      {isCredit ? "+" : ""}
                      {shownAmount.toFixed(2)} <span className="text-fg-muted">USDG</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}
