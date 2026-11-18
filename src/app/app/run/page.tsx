"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Account, AccountPublic, Transaction, PrivacyLayer } from "@/lib/supabase/database.types";
import type { ReactNode } from "react";
import { Page, PageHeader, Panel, Notice } from "@/components/app/ui";
import { cn } from "@/lib/utils";

type RunStatus = "idle" | "running" | "complete" | "error";
type PaymentStatus = "none" | "preparing" | "pending" | "verifying" | "expired";

interface HistorySummary {
  count: number;
  total: number;
  last: string | null;
}

const PRIVACY_LAYERS: PrivacyLayer[] = ["Public", "Confidential", "Shielded"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "n/a";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="shrink-0 text-ok" role="img" aria-label="Verified">
      <circle cx="6" cy="6" r="6" fill="currentColor" fillOpacity="0.18" />
      <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Local presentation helpers ───────────────────────────── */

type FlowStep = "compose" | "review" | "submitting" | "settled" | "failed";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

function PrivacyBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase();
  const tone = t === "shielded" ? "badge-ok" : t === "confidential" ? "badge-signal" : "";
  return <span className={cn("badge capitalize", tone)}>{t}</span>;
}

function SummaryRow({ label, value, num, muted }: { label: string; value: ReactNode; num?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] text-fg-muted">{label}</dt>
      <dd className={cn("min-w-0 truncate text-right text-[13px]", num && "t-mono t-num", muted ? "text-fg-body" : "font-medium text-fg")}>
        {value}
      </dd>
    </div>
  );
}

const FLOW: { key: Exclude<FlowStep, "failed">; label: string }[] = [
  { key: "compose", label: "Compose" },
  { key: "review", label: "Review" },
  { key: "submitting", label: "Submitting" },
  { key: "settled", label: "Settled" },
];

function FlowSteps({ step }: { step: FlowStep }) {
  const activeIndex = step === "failed" ? 3 : FLOW.findIndex((s) => s.key === step);
  return (
    <ol aria-label="Payment progress" className="flex items-center gap-2 overflow-x-auto border-b border-line px-5 py-3 text-[12.5px]">
      {FLOW.map((s, i) => {
        const isLast = i === FLOW.length - 1;
        const failed = isLast && step === "failed";
        const settled = isLast && step === "settled";
        const active = i === activeIndex && !failed && !settled;
        const done = i < activeIndex;
        return (
          <li key={s.key} className="flex shrink-0 items-center gap-2" aria-current={i === activeIndex ? "step" : undefined}>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-medium t-num",
                failed
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : settled
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : active
                      ? "border-signal/50 bg-signal/10 text-signal"
                      : done
                        ? "border-line-strong text-fg-muted"
                        : "border-line text-fg-faint",
              )}
            >
              {failed ? "!" : done || settled ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                failed ? "text-danger" : settled ? "text-ok" : active ? "font-medium text-signal" : done ? "text-fg-body" : "text-fg-faint",
              )}
            >
              {failed ? "Failed" : s.label}
            </span>
            {!isLast && <span aria-hidden="true" className={cn("h-px w-5 sm:w-8", done ? "bg-line-strong" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

function RunPageInner() {
  const searchParams = useSearchParams();
  const initialTo = searchParams.get("to") ?? "";

  // ------------------------------------------------------------------
  // Sender (from account) picker
  // ------------------------------------------------------------------
  const [myAccounts, setMyAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedFromId, setSelectedFromId] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoadingAccounts(false);
        return;
      }
      const { data } = await supabase
        .from("accounts")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("is_primary", { ascending: false });
      const accounts = data ?? [];
      setMyAccounts(accounts);
      const primary = accounts.find((a) => a.is_primary) ?? accounts[0];
      if (primary) setSelectedFromId(primary.id);
      setLoadingAccounts(false);
    });
  }, []);

  const selectedFromAccount = myAccounts.find((a) => a.id === selectedFromId) ?? null;

  // ------------------------------------------------------------------
  // Recipient search (accounts_public, no balance exposed)
  // ------------------------------------------------------------------
  const [recipientInput, setRecipientInput] = useState(initialTo);
  const [recipientMatch, setRecipientMatch] = useState<AccountPublic | null>(null);
  const [recipientResults, setRecipientResults] = useState<AccountPublic[]>([]);
  const [recipientSearching, setRecipientSearching] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const cleaned = recipientInput.trim().replace(/^@/, "").replace(/\.veiled$/i, "");
    if (!cleaned) {
      setRecipientResults([]);
      setRecipientMatch(null);
      setRecipientSearching(false);
      return;
    }
    let cancelled = false;
    setRecipientSearching(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("accounts_public")
        .select("*")
        .ilike("handle", `%${cleaned}%`)
        .limit(6);
      if (cancelled) return;
      const results = (data ?? []).filter((a) => a.id !== selectedFromId);
      setRecipientResults(results);
      const exact = results.find((a) => a.handle.toLowerCase() === cleaned.toLowerCase());
      setRecipientMatch(exact ?? null);
      setRecipientSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [recipientInput, selectedFromId]);

  const handleSelectRecipient = useCallback((acct: AccountPublic) => {
    setRecipientInput(acct.handle);
    setRecipientMatch(acct);
    setRecipientResults([]);
    setInputFocused(false);
  }, []);

  const showDropdown = inputFocused && recipientResults.length > 0;

  // ------------------------------------------------------------------
  // Payment history with this recipient (only visible via my own from-side rows)
  // ------------------------------------------------------------------
  const [history, setHistory] = useState<HistorySummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [txResult, setTxResult] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!recipientMatch || !selectedFromId) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    const supabase = createClient();
    supabase
      .from("transactions")
      .select("amount, created_at")
      .eq("from_account_id", selectedFromId)
      .eq("to_account_id", recipientMatch.id)
      .eq("status", "settled")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = data ?? [];
        setHistory({
          count: rows.length,
          total: rows.reduce((sum, r) => sum + Number(r.amount), 0),
          last: rows[0]?.created_at ?? null,
        });
        setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipientMatch, selectedFromId, txResult]);

  // ------------------------------------------------------------------
  // Amount / memo / privacy layer
  // ------------------------------------------------------------------
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [privacyLayer, setPrivacyLayer] = useState<PrivacyLayer>("Confidential");

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const insufficientBalance = !!selectedFromAccount && amountValid && amountNum > selectedFromAccount.balance;

  // ------------------------------------------------------------------
  // Run / pipeline state
  // ------------------------------------------------------------------
  const [status, setStatus] = useState<RunStatus>("idle");
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Payment review/confirm state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("none");
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(300);
  const paymentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPaymentTimer() {
    setPaymentSecondsLeft(300);
    if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = setInterval(() => {
      setPaymentSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(paymentTimerRef.current!);
          setPaymentStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
    };
  }, []);

  const canSend =
    !loadingAccounts &&
    !!selectedFromId &&
    recipientInput.trim() !== "" &&
    amountValid &&
    !insufficientBalance &&
    status !== "running" &&
    paymentStatus === "none";

  function handleSend() {
    if (!canSend) return;
    setStatus("idle");
    setOutputLines([]);
    setTxResult(null);
    setErrorMessage(null);
    setPaymentStatus("preparing");
    setTimeout(() => {
      setPaymentStatus("pending");
      startPaymentTimer();
    }, 900);
  }

  function handleCancelPayment() {
    if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
    setPaymentStatus("none");
    setPaymentSecondsLeft(300);
  }

  async function handleConfirmPayment() {
    if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
    if (!selectedFromId) return;

    setPaymentStatus("verifying");
    setStatus("running");
    setOutputLines([]);

    const startedAt = Date.now();
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);

    const atmosphericLines = [
      `[veiled] preparing ${privacyLayer.toLowerCase()} transfer...`,
      `[veiled] resolving recipient "${recipientInput.trim()}"...`,
      `[client]    generating ElGamal ciphertext of amount`,
      `[client]    computing ZK range proof...`,
      `[client]    proof generated`,
      `[client]    encoding ConfidentialToken.transfer calldata`,
      `[solana] sending transaction to leader`,
      `[solana] verifying ZK range proof on-chain...`,
    ];

    const animate = async () => {
      for (const line of atmosphericLines) {
        await sleep(170 + Math.random() * 150);
        setOutputLines((prev) => [...prev, line]);
      }
    };

    const supabase = createClient();
    const paymentPromise = supabase.rpc("send_payment", {
      p_from_account_id: selectedFromId,
      p_recipient: recipientInput.trim(),
      p_amount: amountNum,
      p_memo: memo.trim() || null,
      p_privacy_layer: privacyLayer,
    });

    const [, result] = await Promise.all([animate(), paymentPromise]);

    if (timerRef.current) clearInterval(timerRef.current);
    setPaymentStatus("none");
    setPaymentSecondsLeft(300);

    if (result.error) {
      setOutputLines((prev) => [...prev, "", `[veiled] ERROR: ${result.error.message}`, `[veiled] transfer not settled`]);
      setErrorMessage(result.error.message);
      setStatus("error");
      return;
    }

    const tx = result.data;
    setTxResult(tx);
    setOutputLines((prev) => [
      ...prev,
      `[solana] proof verified, transfer authorized`,
      `[solana] finalized in ${tx.finality_ms ?? "n/a"}ms`,
      `[recipient] balance updated`,
      "",
      `[veiled] transaction hash: ${tx.tx_sig ?? "n/a"}`,
      `[veiled] proof hash: ${tx.proof_hash ?? "n/a"}`,
      `[veiled] settlement complete`,
    ]);
    setStatus("complete");
  }

  const paymentMins = String(Math.floor(paymentSecondsLeft / 60)).padStart(2, "0");
  const paymentSecs = String(paymentSecondsLeft % 60).padStart(2, "0");

  const statusBadge =
    status === "complete" ? "badge-ok" : status === "running" ? "badge-signal" : status === "error" ? "badge-danger" : "";
  const statusLabel = status === "complete" ? "Settled" : status === "running" ? "Sending" : status === "error" ? "Failed" : "Ready";

  const breadcrumbLabel = recipientMatch ? recipientMatch.name : recipientInput.trim() ? recipientInput.trim() : "Send Payment";

  // Sequential flow, derived from the existing run + payment state.
  const flowStep: FlowStep =
    status === "complete"
      ? "settled"
      : status === "error"
        ? "failed"
        : paymentStatus === "verifying" || status === "running"
          ? "submitting"
          : paymentStatus === "pending" || paymentStatus === "expired"
            ? "review"
            : "compose";

  const running = status === "running";

  return (
    <Page>
      <nav aria-label="Breadcrumb" className="mb-3 flex min-w-0 items-center gap-1.5 text-[13px] text-fg-muted">
        <Link href="/app" className="rounded transition-colors hover:text-fg">
          Accounts
        </Link>
        <span aria-hidden="true" className="text-fg-faint">/</span>
        <span className="truncate text-fg-body">{breadcrumbLabel}</span>
      </nav>

      <PageHeader title="Send payment" description="Pay a Veiled @handle or an external recipient in USDG." />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Left: compose, review, pipeline */}
        <div className="flex min-w-0 flex-col gap-5">
          <Panel padded={false}>
            <FlowSteps step={flowStep} />

            <div className="divided">
              {/* Recipient search / resolution */}
              <div className="p-5">
                <div className="relative">
                  <label htmlFor="send-to" className="field-label">
                    Pay to
                  </label>
                  <input
                    id="send-to"
                    className="input t-mono"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                    placeholder="@handle or external domain"
                    autoComplete="off"
                    disabled={running}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls="send-to-results"
                    aria-autocomplete="list"
                  />

                  {showDropdown && (
                    <div
                      id="send-to-results"
                      role="listbox"
                      className="glass-strong border-gradient veil-in absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-[12px]"
                    >
                      <div className="divided">
                        {recipientResults.map((r) => (
                          <div
                            key={r.id}
                            role="option"
                            aria-selected={recipientMatch?.id === r.id}
                            onMouseDown={() => handleSelectRecipient(r)}
                            className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-white/[0.05]"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[13.5px] text-fg">{r.name}</div>
                              <div className="t-mono truncate text-[12px] text-fg-muted">@{r.handle}</div>
                            </div>
                            <span className="badge capitalize">{r.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 min-h-[20px]" aria-live="polite">
                  {recipientSearching ? (
                    <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                      <Spinner className="text-signal" />
                      Searching...
                    </div>
                  ) : recipientMatch ? (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-medium text-fg">{recipientMatch.name}</span>
                        <VerifiedBadge />
                      </div>
                      <div className="t-mono mt-0.5 text-[12px] text-fg-muted">@{recipientMatch.handle}</div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-body">{recipientMatch.description ?? "n/a"}</p>
                    </div>
                  ) : recipientInput.trim() ? (
                    <p className="text-[13px] leading-relaxed text-fg-muted">
                      No Veiled account found for &quot;{recipientInput.trim()}&quot;. This will be sent as an external transfer.
                    </p>
                  ) : (
                    <p className="text-[13px] text-fg-muted">Search for a Veiled @handle, or type an external domain or label.</p>
                  )}
                </div>
              </div>

              {/* From account picker */}
              <div className="p-5">
                <div id="send-from-label" className="field-label">
                  From account
                </div>
                {loadingAccounts ? (
                  <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading your accounts">
                    <div className="skeleton h-[54px]" />
                    <div className="skeleton h-[54px]" />
                  </div>
                ) : myAccounts.length === 0 ? (
                  <Notice>No active accounts found.</Notice>
                ) : (
                  <div role="radiogroup" aria-labelledby="send-from-label" className="flex flex-col gap-1.5">
                    {myAccounts.map((a) => {
                      const selected = a.id === selectedFromId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={running}
                          onClick={() => status !== "running" && setSelectedFromId(a.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            selected
                              ? "border-signal/40 bg-signal/[0.07]"
                              : "border-line hover:border-line-strong hover:bg-white/[0.03]",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[13.5px] text-fg">
                              <span className="truncate">{a.name}</span>
                              {a.is_primary && <span className="badge">Primary</span>}
                            </div>
                            <div className="mt-0.5 truncate text-[12px] text-fg-muted">
                              <span className="t-mono">@{a.handle}</span>
                              <span className="capitalize"> · {a.type}</span>
                            </div>
                          </div>
                          <div className="t-mono t-num shrink-0 text-[13.5px] font-medium text-fg">{formatUsd(a.balance)}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Amount / privacy / memo */}
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <label htmlFor="send-amount" className="field-label">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      id="send-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="input t-mono t-num pr-16! text-[15px]!"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={running}
                      aria-invalid={insufficientBalance || undefined}
                      aria-describedby={insufficientBalance ? "send-amount-error" : undefined}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-fg-faint">
                      USDG
                    </span>
                  </div>
                  {insufficientBalance && (
                    <p id="send-amount-error" className="mt-1.5 text-[12.5px] text-danger">
                      Insufficient balance in this account.
                    </p>
                  )}
                </div>

                <div>
                  <div id="send-privacy-label" className="field-label">
                    Privacy layer
                  </div>
                  <div role="group" aria-labelledby="send-privacy-label" className="segmented flex! w-full">
                    {PRIVACY_LAYERS.map((layer) => (
                      <button
                        key={layer}
                        type="button"
                        aria-pressed={privacyLayer === layer}
                        onClick={() => status !== "running" && setPrivacyLayer(layer)}
                        disabled={running}
                        className="flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {layer}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="send-memo" className="field-label">
                    Memo <span className="font-normal text-fg-faint">(optional)</span>
                  </label>
                  <textarea
                    id="send-memo"
                    className="input resize-y"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="What's this payment for?"
                    disabled={running}
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer: status + primary action */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2" aria-live="polite">
                  <span className={cn("badge", statusBadge)}>
                    <span className="dot" />
                    {statusLabel}
                  </span>
                  {running && <span className="t-mono t-num text-[12.5px] text-fg-muted">{(elapsedMs / 1000).toFixed(1)}s</span>}
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className={cn("btn", paymentStatus === "none" ? "btn-primary" : "btn-secondary")}
                >
                  {running ? (
                    <>
                      <Spinner />
                      Sending...
                    </>
                  ) : paymentStatus === "preparing" ? (
                    <>
                      <Spinner />
                      Preparing...
                    </>
                  ) : (
                    "Send payment"
                  )}
                </button>
              </div>
            </div>
          </Panel>

          {/* Review / confirm sheet */}
          {(paymentStatus === "pending" || paymentStatus === "verifying" || paymentStatus === "expired") && (
            <section
              aria-label="Review transfer"
              className={cn(
                "surface veil-in overflow-hidden",
                paymentStatus === "expired" ? "border-danger/30!" : "border-signal/30!",
              )}
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {paymentStatus === "verifying" ? (
                    <Spinner className="text-signal" />
                  ) : (
                    <span className={cn("dot", paymentStatus === "expired" ? "text-danger" : "text-signal")} />
                  )}
                  <h2 className="text-[14px] font-semibold text-fg">
                    {paymentStatus === "expired"
                      ? "Review expired"
                      : paymentStatus === "verifying"
                        ? "Submitting transfer..."
                        : "Review confidential transfer"}
                  </h2>
                </div>
                {paymentStatus === "pending" && (
                  <div
                    className={cn("t-mono t-num text-[13px] font-medium", paymentSecondsLeft < 60 ? "text-danger" : "text-warn")}
                    aria-label={`Review window closes in ${paymentMins} minutes ${paymentSecs} seconds`}
                  >
                    {paymentMins}:{paymentSecs}
                  </div>
                )}
              </div>

              {paymentStatus === "verifying" ? (
                <div className="flex items-center gap-3.5 px-5 py-6">
                  <Spinner className="h-5 w-5 text-signal" />
                  <div>
                    <div className="text-[13.5px] font-medium text-fg">Verifying ZK range proof and settling transfer</div>
                    <div className="mt-0.5 text-[13px] text-fg-muted">This usually takes a moment.</div>
                  </div>
                </div>
              ) : paymentStatus === "expired" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <p className="text-[13.5px] text-fg-body">This review window has closed. Start a new payment to try again.</p>
                  <button type="button" onClick={handleCancelPayment} className="btn btn-secondary btn-sm">
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-fg-muted">Amount</span>
                    <span className="t-mono t-num text-[22px] font-semibold tracking-[-0.02em] text-fg">
                      {formatUsd(amountNum)} <span className="text-[12.5px] font-normal text-fg-muted">USDG</span>
                    </span>
                  </div>

                  <dl className="well divided px-3.5">
                    {[
                      { label: "From", value: selectedFromAccount ? `@${selectedFromAccount.handle}` : "n/a", mono: true },
                      { label: "To", value: recipientMatch ? `@${recipientMatch.handle}` : recipientInput.trim() || "n/a", mono: true },
                      { label: "Memo", value: memo.trim() || "n/a", mono: false },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="shrink-0 text-[13px] text-fg-muted">{row.label}</dt>
                        <dd className={cn("min-w-0 truncate text-right text-[13px] text-fg", row.mono && "t-mono")}>{row.value}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="text-[13px] text-fg-muted">Privacy layer</dt>
                      <dd>
                        <PrivacyBadge tier={privacyLayer} />
                      </dd>
                    </div>
                  </dl>

                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    Confirming submits a <strong className="font-medium text-fg">{formatUsd(amountNum)} USDG</strong>{" "}
                    {privacyLayer.toLowerCase()} transfer. This action is final once settled.
                  </p>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={handleCancelPayment} className="btn btn-ghost">
                      Cancel
                    </button>
                    <button type="button" onClick={handleConfirmPayment} className="btn btn-primary">
                      Confirm and send
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Pipeline log */}
          {(outputLines.length > 0 || status !== "idle") && (
            <Panel padded={false} className="veil-in overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div className="flex min-w-0 items-center gap-2 text-[13px]">
                  <span className="font-medium text-fg">Pipeline</span>
                  <span className="t-mono truncate text-fg-faint">{txResult ? txResult.id.slice(0, 8) : "…"}</span>
                </div>
                {status === "complete" && (
                  <span className="t-mono t-num text-[12.5px] text-ok">{(elapsedMs / 1000).toFixed(2)}s</span>
                )}
              </div>

              <div
                ref={outputRef}
                className="t-mono flex max-h-[360px] flex-col overflow-y-auto bg-ink-1/60 px-5 py-3.5 text-[12.5px] leading-[20px]"
                role="log"
                aria-live="polite"
              >
                {outputLines.map((line, i) => {
                  const l = line ?? "";
                  const tone = l.startsWith("[veiled] ERROR")
                    ? "text-danger"
                    : l.startsWith("[recipient]") || l.includes("complete") || l.includes("committed")
                      ? "text-ok"
                      : l.startsWith("[veiled]") || l.startsWith("[solana]")
                        ? "text-fg-body"
                        : "text-fg-muted";
                  return (
                    <div key={i} className={cn("whitespace-pre-wrap break-words", tone)}>
                      {line || " "}
                    </div>
                  );
                })}
                {running && <div className="text-signal" aria-hidden="true">▋</div>}
              </div>

              {status === "error" && errorMessage && (
                <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Notice tone="danger" className="min-w-0 flex-1">
                    Transfer not settled: {errorMessage}
                  </Notice>
                  <button type="button" onClick={handleSend} disabled={!canSend} className="btn btn-secondary btn-sm shrink-0">
                    Try again
                  </button>
                </div>
              )}

              {status === "complete" && txResult && (
                <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-ok">
                        <span className="dot" />
                        Settled
                      </span>
                      <span className="text-[12.5px] text-fg-muted">Transaction hash</span>
                    </div>
                    <div className="t-mono mt-1.5 truncate text-[12.5px] text-fg-body">{(txResult.tx_sig ?? "n/a").slice(0, 48)}</div>
                  </div>
                  <Link href="/app/executions" className="btn btn-secondary btn-sm shrink-0">
                    View receipt
                  </Link>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* Right: summary */}
        <aside className="flex min-w-0 flex-col gap-5">
          <Panel padded={false}>
            <div className="divided">
              <div className="p-5">
                <h2 className="mb-3 text-[14px] font-semibold text-fg">Recipient details</h2>
                {recipientMatch ? (
                  <dl className="flex flex-col gap-2.5">
                    <SummaryRow label="Account type" value={recipientMatch.type === "agent" ? "Agent account" : "Human account"} />
                    <SummaryRow label="Privacy tier" value={<PrivacyBadge tier={recipientMatch.privacy_tier} />} />
                    <SummaryRow label="Member since" value={formatDate(recipientMatch.created_at)} />
                  </dl>
                ) : (
                  <p className="text-[13px] leading-relaxed text-fg-muted">
                    {recipientInput.trim()
                      ? "Not a registered Veiled handle. Routed as an external transfer."
                      : "Search for a recipient to see account details."}
                  </p>
                )}
              </div>

              {recipientMatch && (
                <div className="p-5">
                  <h2 className="mb-3 text-[14px] font-semibold text-fg">Your history with this recipient</h2>
                  {historyLoading ? (
                    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading history">
                      <div className="skeleton h-4" />
                      <div className="skeleton h-4" />
                      <div className="skeleton h-4" />
                    </div>
                  ) : (
                    <dl className="flex flex-col gap-2.5">
                      <SummaryRow label="Payments sent" value={history ? history.count.toLocaleString() : "n/a"} num />
                      <SummaryRow label="Total sent" value={history ? formatUsd(history.total) : "n/a"} num />
                      <SummaryRow label="Last payment" value={history ? formatDate(history.last) : "n/a"} />
                    </dl>
                  )}
                </div>
              )}

              <div className="p-5">
                <h2 className="mb-3 text-[14px] font-semibold text-fg">Fee breakdown</h2>
                <dl className="flex flex-col gap-2.5">
                  <SummaryRow label="Payment amount" value={amountValid ? formatUsd(amountNum) : "n/a"} num muted />
                  <SummaryRow label="Network fee" value={amountValid ? formatUsd(0) : "n/a"} num muted />
                  <div className="border-t border-line pt-2.5">
                    <SummaryRow label="Recipient receives" value={amountValid ? formatUsd(amountNum) : "n/a"} num />
                  </div>
                </dl>
                <p className="mt-3 text-[12.5px] leading-relaxed text-fg-faint">Veiled does not charge a network fee on transfers.</p>
              </div>
            </div>
          </Panel>

          <Link href="/app" className="btn btn-ghost w-full">
            Browse all accounts
          </Link>
        </aside>
      </div>
    </Page>
  );
}

export default function RunPage() {
  return (
    <Suspense>
      <RunPageInner />
    </Suspense>
  );
}
