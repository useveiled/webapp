"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Sample workflow: an agent account pays for an API call over x402.
   Deterministic and labeled as a sample. Every step is plain text in the
   DOM, so the stage reads as a transcript without JS or animation. */

type Step = {
  title: string;
  note: string;
  lines: { text: string; tone?: "ok" | "muted" | "fg" }[];
};

const STEPS: Step[] = [
  {
    title: "Request",
    note: "The agent calls a paid API.",
    lines: [
      { text: "GET api.marketfeed.io/v1/quotes", tone: "fg" },
      { text: "402 Payment Required · 0.25 USDG", tone: "muted" },
    ],
  },
  {
    title: "Policy check",
    note: "Enforced by the agent's smart account, not by a server.",
    lines: [
      { text: "0.25 per request, limit 5.00", tone: "ok" },
      { text: "api.marketfeed.io is on the allowlist", tone: "ok" },
      { text: "12.65 of 50.00 USDG spent today", tone: "ok" },
      { text: "Under the 25.00 approval threshold", tone: "ok" },
    ],
  },
  {
    title: "Encrypt and prove",
    note: "The amount is encrypted before it leaves, with a range proof that it is valid.",
    lines: [{ text: "ciphertext + range proof attached", tone: "muted" }],
  },
  {
    title: "Settle",
    note: "A confidential transfer lands on Solana.",
    lines: [{ text: "confirmed · 1 slot", tone: "fg" }],
  },
  {
    title: "Deliver",
    note: "The agent retries with proof of payment.",
    lines: [
      { text: "GET /v1/quotes + X-Payment", tone: "fg" },
      { text: "200 OK", tone: "ok" },
    ],
  },
];

const DONE = STEPS.length;
const STEP_MS = 620;

type View = "owner" | "public";

const RECORD: { label: string; owner: string; public: string; hidden?: boolean; mono?: boolean }[] = [
  { label: "From", owner: "datafetch.veiled", public: "7xKX…9fQa", mono: true },
  { label: "To", owner: "marketfeed.veiled", public: "3mPq…Lw2d", mono: true },
  { label: "Asset", owner: "USDG", public: "USDG" },
  { label: "Amount", owner: "0.25 USDG", public: "a3f1 9c0e 77b2 e41d", hidden: true },
  { label: "Balance after", owner: "1,184.10 USDG", public: "5d08 b6aa 2e19 c7f3", hidden: true },
  { label: "Signature", owner: "4kQd…7RtV", public: "4kQd…7RtV", mono: true },
];

function StepMark({ state }: { state: "pending" | "active" | "done" }) {
  if (state === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-ok/15 text-ok">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5.2 4.1 7.2 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full border border-signal/60">
        <span className="size-2 rounded-full bg-signal" />
      </span>
    );
  }
  return <span className="block size-5 rounded-full border border-line-strong" />;
}

export function PaymentStage() {
  // Server render and no-JS show the finished workflow.
  const [step, setStep] = useState(DONE);
  const [view, setView] = useState<View>("owner");
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const played = useRef(false);

  function play() {
    if (timer.current) clearInterval(timer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(DONE);
      return;
    }
    setStep(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= DONE && timer.current) clearInterval(timer.current);
    }, STEP_MS);
  }

  // Play once, the first time the stage is mostly on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played.current) {
          played.current = true;
          play();
        }
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const settled = step >= 3;
  const running = step < DONE;

  return (
    <div ref={rootRef} className="glass border-gradient overflow-hidden rounded-[22px]">
      {/* Stage header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.06] text-[12px] font-semibold text-fg">
            D
          </span>
          <div className="min-w-0">
            <div className="t-mono truncate text-[13px] text-fg">datafetch.veiled</div>
            <div className="text-[12px] text-fg-faint">Agent account</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="badge">Sample workflow</span>
          <button type="button" onClick={play} disabled={running} className="btn btn-secondary btn-sm">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6a4 4 0 1 0 1.2-2.85M2 1.5v2.2h2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Replay
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Steps */}
        <ol className="relative px-4 py-5 sm:px-6" aria-label="Payment steps">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "pending";
            return (
              <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[9.5px] top-6 bottom-0 w-px transition-colors duration-500",
                      i < step ? "bg-ok/30" : "bg-line"
                    )}
                  />
                )}
                <span className="relative mt-0.5 shrink-0">
                  <StepMark state={state} />
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1 transition-opacity duration-500",
                    state === "pending" ? "opacity-40" : "opacity-100"
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-medium text-fg">{s.title}</span>
                    <span className="sr-only">{state === "done" ? "(complete)" : state === "active" ? "(in progress)" : "(waiting)"}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{s.note}</p>
                  <ul className="mt-2 space-y-1">
                    {s.lines.map((l) => (
                      <li
                        key={l.text}
                        className={cn(
                          "t-mono flex items-start gap-2 text-[12.5px] leading-snug",
                          l.tone === "ok" ? "text-fg-body" : l.tone === "fg" ? "text-fg" : "text-fg-muted"
                        )}
                      >
                        {l.tone === "ok" && <span aria-hidden="true" className="text-ok">✓</span>}
                        <span className="min-w-0 break-words">{l.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Transfer record, as the owner sees it vs. as the chain shows it */}
        <div className="border-t border-line bg-ink-1/60 px-4 py-5 sm:px-6 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[14px] font-medium text-fg">Transfer record</h3>
            <div className="segmented" role="group" aria-label="Choose whose view of the record to show">
              <button type="button" aria-pressed={view === "owner"} onClick={() => setView("owner")}>
                Your view
              </button>
              <button type="button" aria-pressed={view === "public"} onClick={() => setView("public")}>
                Public chain
              </button>
            </div>
          </div>

          <dl className="divided mt-4" aria-live="polite">
            {RECORD.map((r) => {
              const value = settled ? (view === "owner" ? r.owner : r.public) : "…";
              const encrypted = settled && view === "public" && r.hidden;
              return (
                <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-[13px] text-fg-muted">{r.label}</dt>
                  <dd className="min-w-0 text-right">
                    {encrypted ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="cipher text-[12.5px]">{value}</span>
                        <span className="badge badge-signal">Encrypted</span>
                      </span>
                    ) : (
                      <span className={cn("text-[13.5px] text-fg", (r.mono || r.hidden) && "t-mono t-num")}>{value}</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="mt-4 text-[12.5px] leading-relaxed text-fg-muted">
            {view === "public"
              ? "This is everything an observer can read. Addresses stay public on Solana; amounts and balances are ciphertext that only a view key opens."
              : "You decrypt amounts on your own device. Veiled's servers can't, and neither can validators."}
          </p>

          <div className="mt-4 flex items-center gap-2 text-[12.5px]">
            {settled ? (
              <span className="badge badge-ok">
                <span className="dot" />
                Settled
              </span>
            ) : (
              <span className="badge">
                <span className="dot opacity-60" />
                Waiting for settlement
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
