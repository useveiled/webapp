"use client";

/* The homepage hero window: Veiled's /app, working, drawn live in HTML.
   One sample customer (Ada Okafor, the same person the homepage shows) runs
   four flows end to end: reveal a balance, pay a handle, watch it settle,
   generate a card. Every label, log line and badge is copied from the real
   /app pages (src/app/app/**), and the shell uses the app's own classes, so
   it reads as the product rather than a mockup of it.

   Each View draws the 1200 × 750 stage from `t` alone (seconds into its step).
   Times are named constants at the top of each step so the choreography reads
   like a script and can be retimed in one place. Custom classes and keyframes
   use the `vd-` prefix; everything else is the app's design system. */

import type { ReactNode } from "react";
import StepWindow, { AimCursor, ease, typed, type Step } from "./StepWindow";
import { NAV_GROUPS, SETTINGS_ITEM } from "@/components/app/nav";
import { cn } from "@/lib/utils";
import "./app-demo.css";

/* ── Shell: the /app sidebar and top bar at stage scale ───────────────────── */

function Shell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-ink-0 font-sans text-fg">
      {/* the dashboard backdrop, as in /app */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/bg-app-wave.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-20" />

      <aside className="glass-strong border-gradient absolute bottom-[10px] left-[10px] top-[10px] flex w-[206px] flex-col rounded-[16px]">
        <div className="flex h-[50px] items-center gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="" width={22} height={22} />
          <span className="font-[family-name:var(--font-heading)] text-[14px] font-semibold">Veiled</span>
        </div>
        <nav className="flex flex-1 flex-col gap-4 px-2">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="flex flex-col gap-px">
              <div className="mb-1 px-2.5 text-[11px] font-medium text-fg-faint">{g.label}</div>
              {g.items.map((item) => (
                <NavRow key={item.label} label={item.label} icon={item.icon} on={item.label === active} />
              ))}
            </div>
          ))}
        </nav>
        <div className="px-2 pb-1.5">
          <NavRow label={SETTINGS_ITEM.label} icon={SETTINGS_ITEM.icon} on={false} />
        </div>
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-[10px] border border-line bg-white/[0.03] px-2 py-1.5">
          <span className="flex size-6 items-center justify-center rounded-[6px] bg-fg text-[9.5px] font-semibold text-ink-0">AO</span>
          <span className="flex-1 truncate text-[12px] font-medium">Ada Okafor</span>
        </div>
      </aside>

      <header className="glass-strong border-gradient absolute left-[226px] right-[10px] top-[10px] flex h-[44px] items-center gap-2 rounded-[12px] px-5 text-[12.5px]">
        <span className="text-fg-faint">Veiled</span>
        <span className="text-fg-faint">/</span>
        <span className="font-medium text-fg">{title}</span>
      </header>

      <main className="absolute bottom-0 left-[226px] right-[10px] top-[54px] px-[22px] pt-[22px]">{children}</main>
    </div>
  );
}

function NavRow({ label, icon, on }: { label: string; icon: ReactNode; on: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[29px] items-center gap-2 rounded-[8px] px-2.5 text-[12.5px]",
        on ? "bg-white/[0.07] font-medium text-fg" : "text-fg-muted",
      )}
    >
      <span className={cn("flex scale-90", on ? "text-signal" : "opacity-80")}>{icon}</span>
      {label}
    </div>
  );
}

function Head({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 text-[12.5px] text-fg-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* A balance behind a veil: a fixed placeholder, blurred, that clears to the
   real number as `r` goes 0 → 1 (the same treatment as /app's Accounts page). */
function VeiledAmount({ value, r }: { value: number; r: number }) {
  return (
    // both layers share one grid cell, so the box is as wide as the wider one
    <span className="inline-grid text-[21px] font-semibold leading-tight tracking-[-0.01em] [&>*]:[grid-area:1/1]">
      <span className="t-num text-fg-body" style={{ filter: `blur(${5 * (1 - r)}px)`, opacity: 1 - r }}>
        $0,000.00
      </span>
      <span className="t-num text-fg" style={{ filter: `blur(${6 * (1 - r)}px)`, opacity: r }}>
        {fmt(value)}
      </span>
    </span>
  );
}

/* ── Step 1: Accounts. Show two balances. ─────────────────────────────────── */

const A_SHOW1 = 1.7;
const A_SHOW2 = 3.6;

type Acct = {
  name: string;
  handle: string;
  type: "Human" | "Agent";
  primary?: boolean;
  balance: number;
  tier: "Confidential" | "Shielded";
  policy?: [string, string][];
  description?: string;
  aim?: string;
};
const ACCOUNTS: Acct[] = [
  { name: "Ada Okafor", handle: "@ada.veiled", type: "Human", primary: true, balance: 48902.17, tier: "Confidential", aim: "show-1" },
  {
    name: "research-bot",
    handle: "research-bot.veiled",
    type: "Agent",
    balance: 212.4,
    tier: "Confidential",
    policy: [
      ["Per request", "$5.00"],
      ["Daily limit", "$50.00"],
      ["Domains", "2"],
    ],
    aim: "show-2",
  },
  { name: "Savings", handle: "@ada-savings.veiled", type: "Human", balance: 120000, tier: "Shielded", description: "Long-term reserve" },
  {
    name: "invoice-agent",
    handle: "invoice-agent.veiled",
    type: "Agent",
    balance: 1840,
    tier: "Confidential",
    policy: [
      ["Per request", "$250.00"],
      ["Daily limit", "$2,000.00"],
      ["Domains", "4"],
    ],
  },
  { name: "Payroll", handle: "@ada-payroll.veiled", type: "Human", balance: 36500, tier: "Confidential", description: "Contractor payments" },
  {
    name: "scraper",
    handle: "scraper.veiled",
    type: "Agent",
    balance: 3,
    tier: "Confidential",
    policy: [
      ["Per request", "$1.00"],
      ["Daily limit", "$10.00"],
      ["Domains", "any"],
    ],
  },
];

function AccountTile({ a, r }: { a: Acct; r: number }) {
  const shown = r > 0.02;
  return (
    <article className="surface flex h-[238px] flex-col p-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold">{a.name}</h3>
          {a.primary && <span className="badge">Primary</span>}
        </div>
        <div className="mt-0.5 text-[12px] text-fg-muted">
          <span className="t-mono">{a.handle}</span> <span className="text-fg-faint">·</span> {a.type}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-fg-muted">Balance</span>
          <span data-aim={a.aim} className="inline-flex items-center gap-1 rounded-[6px] px-1 text-[12px] text-fg-muted">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            {shown ? "Hide" : "Show"}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <VeiledAmount value={a.balance} r={r} />
          <span className="text-[12px] text-fg-faint">USDG</span>
        </div>
      </div>
      {a.policy ? (
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          {a.policy.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11.5px] text-fg-muted">{k}</dt>
              <dd className="t-num mt-0.5 text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>
      ) : a.description ? (
        <p className="mt-3 text-[12.5px] text-fg-muted">{a.description}</p>
      ) : null}
      <div className="mt-auto flex items-center justify-between">
        <span className={cn("badge", a.tier === "Shielded" ? "badge-ok" : "badge-signal")}>{a.tier}</span>
        <span className="btn btn-secondary btn-sm">
          Send payment <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}

function AccountsStep({ t }: { t: number }) {
  const r1 = ease(t, A_SHOW1 + 0.08, A_SHOW1 + 0.7);
  const r2 = ease(t, A_SHOW2 + 0.08, A_SHOW2 + 0.7);
  return (
    <Shell active="Accounts" title="Accounts">
      <Head
        title="Accounts"
        description="6 accounts. Balances stay hidden until you choose to show them."
        action={
          <span className="btn btn-primary btn-sm !h-9 !px-4">
            <span aria-hidden="true">+</span> Create account
          </span>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="segmented">
          <button type="button" aria-pressed="true">All</button>
          <button type="button">Human</button>
          <button type="button">Agent</button>
        </div>
        <span className="ml-auto flex h-9 w-[250px] items-center gap-2 rounded-[10px] border border-white/10 bg-ink-1 px-3 text-[12.5px] text-fg-faint">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Search accounts, handles...
        </span>
        <span className="flex h-9 items-center rounded-[10px] border border-white/10 bg-ink-1 px-3 text-[12.5px]">Most recent</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <AccountTile a={ACCOUNTS[0]} r={r1} />
        <AccountTile a={ACCOUNTS[1]} r={r2} />
        {ACCOUNTS.slice(2).map((a) => (
          <AccountTile key={a.name} a={a} r={0} />
        ))}
      </div>
      <AimCursor
        t={t}
        path={[
          [0, 0, [760, 650]],
          [0.7, 1.4, "show-1"],
          [2.7, 3.3, "show-2"],
          [4.4, 5.2, [900, 640]],
        ]}
        clicks={[A_SHOW1, A_SHOW2]}
      />
    </Shell>
  );
}

/* ── Steps 2–3: Send payment, then settle ─────────────────────────────────── */

const FLOW = ["Compose", "Review", "Submitting", "Settled"] as const;

function FlowSteps({ at }: { at: number }) {
  return (
    <ol className="flex items-center gap-2 border-b border-line px-5 py-3 text-[12px]">
      {FLOW.map((label, i) => {
        const settled = i === 3 && at === 3;
        const active = i === at && !settled;
        const done = i < at;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "t-num flex h-5 w-5 items-center justify-center rounded-full border text-[10.5px] font-medium",
                settled ? "border-ok/40 bg-ok/10 text-ok" : active ? "border-signal/50 bg-signal/10 text-signal" : done ? "border-line-strong text-fg-muted" : "border-line text-fg-faint",
              )}
            >
              {done || settled ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={cn(settled ? "text-ok" : active ? "font-medium text-signal" : done ? "text-fg-body" : "text-fg-faint")}>{label}</span>
            {i < 3 && <span className={cn("h-px w-7", done ? "bg-line-strong" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, value, num, muted }: { label: string; value: ReactNode; num?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[12.5px] text-fg-muted">{label}</dt>
      <dd className={cn("text-[12.5px]", num && "t-mono t-num", muted ? "text-fg-body" : "font-medium text-fg")}>{value}</dd>
    </div>
  );
}

function Summary({ picked, amount }: { picked: boolean; amount: number | null }) {
  return (
    <div className="flex flex-col gap-3">
      <section className="surface p-4">
        <h2 className="mb-3 text-[13.5px] font-semibold">Recipient details</h2>
        {picked ? (
          <dl className="flex flex-col gap-2.5">
            <SummaryRow label="Account type" value="Agent account" />
            <SummaryRow label="Privacy tier" value={<span className="badge badge-signal">confidential</span>} />
            <SummaryRow label="Member since" value="Mar 2026" />
          </dl>
        ) : (
          <p className="text-[12.5px] text-fg-muted">Search for a recipient to see account details.</p>
        )}
      </section>
      <section className="surface p-4">
        <h2 className="mb-3 text-[13.5px] font-semibold">Fee breakdown</h2>
        <dl className="flex flex-col gap-2.5">
          <SummaryRow label="Payment amount" value={amount ? fmt(amount) : "n/a"} num muted />
          <SummaryRow label="Network fee" value={amount ? fmt(0) : "n/a"} num muted />
          <div className="border-t border-line pt-2.5">
            <SummaryRow label="Recipient receives" value={amount ? fmt(amount) : "n/a"} num />
          </div>
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-fg-faint">Veiled does not charge a network fee on transfers.</p>
      </section>
    </div>
  );
}

const S_FOCUS = 0.75;
const S_TYPE = [0.95, 1.7] as const;
const S_LIST = 1.85;
const S_PICK = 2.55;
const S_AMT_FOCUS = 3.05;
const S_AMT_TYPE = [3.2, 3.65] as const;
const S_SEND = 4.35;
const S_REVIEW = 4.45;
const S_CONFIRM = 6.25;

function SendStep({ t }: { t: number }) {
  const handle = t >= S_PICK ? "@marketfeed" : typed("@marketfeed", t, ...S_TYPE);
  const toFocused = t >= S_FOCUS && t < S_PICK;
  const listOpen = t >= S_LIST && t < S_PICK + 0.08;
  const picked = t >= S_PICK + 0.08;
  const amountText = typed("250.00", t, ...S_AMT_TYPE);
  const amtFocused = t >= S_AMT_FOCUS && t < S_SEND;
  const amount = t >= S_AMT_TYPE[1] ? 250 : null;
  const review = ease(t, S_REVIEW, S_REVIEW + 0.4);
  const submitting = t >= S_CONFIRM + 0.08;
  const flowAt = submitting ? 2 : t >= S_REVIEW ? 1 : 0;
  const ready = picked && amount !== null;

  return (
    <Shell active="Send Payment" title="Send Payment">
      <div className="mb-2 text-[12px] text-fg-muted">
        Accounts <span className="text-fg-faint">/</span> <span className="text-fg-body">Send Payment</span>
      </div>
      <Head title="Send payment" description="Pay a Veiled @handle or an external recipient in USDG." />
      <div className="grid grid-cols-[minmax(0,1fr)_290px] items-start gap-4">
        <section className="surface relative overflow-hidden">
          <FlowSteps at={flowAt} />
          <div className="divided">
            <div className="relative p-4">
              <div className="field-label !text-[12.5px]">Pay to</div>
              <div
                data-aim="pay-to"
                className={cn("input t-mono flex !h-9 items-center gap-2 !text-[13px]", toFocused && "!border-signal/40 shadow-[0_0_0_3px_rgba(184,172,242,0.16)]")}
              >
                {handle ? <span className="text-fg">{handle}</span> : <span className="text-fg-faint">@handle or external domain</span>}
                {toFocused && <span className="vd-caret" />}
                {picked && (
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" className="ml-auto text-ok" aria-hidden="true">
                    <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div
                className={cn("border-gradient elev-lg absolute inset-x-4 top-[78px] z-10 rounded-[12px] bg-[#0f1217] p-1.5", !listOpen && "invisible")}
              >
                <div data-aim="pick" className="flex items-center gap-2.5 rounded-[8px] bg-white/[0.05] px-2.5 py-2">
                  <span className="flex size-7 items-center justify-center rounded-[7px] bg-white/[0.06] text-[11px] font-semibold">M</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium">Market Feed</div>
                    <div className="t-mono text-[11.5px] text-fg-muted">@marketfeed.veiled</div>
                  </div>
                  <span className="badge capitalize">agent</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="field-label !text-[12.5px]">From account</div>
              <div className="flex items-center gap-2.5 rounded-[10px] border border-signal/40 bg-signal/[0.06] px-3 py-2">
                <span className="size-3 rounded-full border border-signal bg-signal shadow-[inset_0_0_0_2.5px_var(--ink-1)]" />
                <span className="text-[12.5px] font-medium">Ada Okafor</span>
                <span className="t-mono text-[11.5px] text-fg-muted">@ada</span>
                <span className="badge ml-auto">Primary</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <div className="field-label !text-[12.5px]">Amount</div>
                <div
                  data-aim="amount"
                  className={cn("input t-mono flex !h-9 items-center !text-[13px]", amtFocused && "!border-signal/40 shadow-[0_0_0_3px_rgba(184,172,242,0.16)]")}
                >
                  {amountText ? <span>{amountText}</span> : <span className="text-fg-faint">0.00</span>}
                  {amtFocused && <span className="vd-caret" />}
                  <span className="ml-auto text-[11.5px] text-fg-muted">USDG</span>
                </div>
              </div>
              <div>
                <div className="field-label !text-[12.5px]">Privacy layer</div>
                <div className="segmented w-full">
                  <button type="button" className="flex-1">Public</button>
                  <button type="button" className="flex-1" aria-pressed="true">Confidential</button>
                  <button type="button" className="flex-1">Shielded</button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="field-label !text-[12.5px]">
                Memo <span className="font-normal text-fg-faint">(optional)</span>
              </div>
              <div className="input !h-[64px] !py-2 !text-[13px] text-fg-faint">What&apos;s this payment for?</div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className={cn("badge", flowAt >= 2 ? "badge-signal" : "")}>{flowAt >= 2 ? "Sending" : "Ready"}</span>
              <span data-aim="send" className={cn("btn btn-sm !h-9 !px-4", flowAt >= 1 ? "btn-secondary" : "btn-primary", !ready && "opacity-45")}>
                Send payment
              </span>
            </div>
          </div>

          {/* Review sheet, sliding up over the form */}
          <div
            className="absolute inset-x-0 bottom-0 top-[45px] bg-[#0d0f14] p-5"
            style={{ opacity: review, transform: `translateY(${(1 - review) * 16}px)`, visibility: review > 0 ? "visible" : "hidden" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">{submitting ? "Submitting transfer..." : "Review confidential transfer"}</h3>
              <span className="badge t-num">04:58</span>
            </div>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[12.5px] text-fg-muted">Amount</span>
              <span className="t-num ml-auto text-[24px] font-semibold">
                $250.00 <span className="text-[12px] font-normal text-fg-muted">USDG</span>
              </span>
            </div>
            <dl className="divided mt-2">
              {[
                ["To", "@marketfeed"],
                ["From", "@ada"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5 text-[12.5px]">
                  <dt className="text-fg-muted">{k}</dt>
                  <dd className="t-mono">{v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5 text-[12.5px]">
                <dt className="text-fg-muted">Privacy layer</dt>
                <dd>
                  <span className="badge badge-signal">confidential</span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-muted">
              Confirming submits a <strong className="font-medium text-fg">$250.00 USDG</strong> confidential transfer. This action is final once settled.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <span className="btn btn-ghost btn-sm">Cancel</span>
              <span data-aim="confirm" className={cn("btn btn-primary btn-sm !h-9 !px-4", submitting && "opacity-60")}>
                Confirm and send
              </span>
            </div>
          </div>
        </section>

        <Summary picked={picked} amount={amount} />
      </div>

      <AimCursor
        t={t}
        path={[
          [0, 0, [900, 640]],
          [0.15, 0.7, "pay-to"],
          [2.0, 2.45, "pick"],
          [2.6, 3.0, "amount"],
          [3.7, 4.25, "send"],
          [5.6, 6.15, "confirm"],
          [6.6, 7.3, [1080, 560]],
        ]}
        clicks={[S_FOCUS, S_PICK, S_AMT_FOCUS, S_SEND, S_CONFIRM]}
        hideFrom={6.9}
      />
    </Shell>
  );
}

/* Settle: the pipeline log, line by line, as the Send page prints it. */
const LOG: [number, string][] = [
  [0.25, "[veiled] preparing confidential transfer..."],
  [0.5, '[veiled] resolving recipient "@marketfeed"...'],
  [0.75, "[client]    generating ElGamal ciphertext of amount"],
  [1.0, "[client]    computing ZK range proof..."],
  [1.35, "[client]    proof generated"],
  [1.6, "[client]    encoding ConfidentialToken.transfer calldata"],
  [1.85, "[solana] sending transaction to leader"],
  [2.1, "[solana] verifying ZK range proof on-chain..."],
  [2.9, "[solana] proof verified, transfer authorized"],
  [3.1, "[solana] finalized in 412ms"],
  [3.3, "[recipient] balance updated"],
  [3.45, ""],
  [3.5, "[veiled] transaction hash: 4kQd9vN2pXr7Lw2dHn4s1fE9mT3cB8aY7RtV"],
  [3.65, "[veiled] proof hash: 0x91be5c3af0d46e27c4a07d132b9e8f61"],
  [3.8, "[veiled] settlement complete"],
];
const DONE_AT = 3.95;

function logTone(l: string) {
  if (l.startsWith("[recipient]") || l.includes("complete")) return "text-ok";
  if (l.startsWith("[veiled]") || l.startsWith("[solana]")) return "text-fg-body";
  return "text-fg-muted";
}

function SettleStep({ t }: { t: number }) {
  const lines = LOG.filter(([at]) => t >= at).map(([, l]) => l);
  const done = t >= DONE_AT;
  const glow = ease(t, DONE_AT, DONE_AT + 0.6);
  return (
    <Shell active="Send Payment" title="Send Payment">
      <div className="mb-2 text-[12px] text-fg-muted">
        Accounts <span className="text-fg-faint">/</span> <span className="text-fg-body">Send Payment</span>
      </div>
      <Head title="Send payment" description="Pay a Veiled @handle or an external recipient in USDG." />
      <div className="grid grid-cols-[minmax(0,1fr)_290px] items-start gap-4">
        <div className="flex flex-col gap-3">
          <section className="surface overflow-hidden">
            <FlowSteps at={done ? 3 : 2} />
            <div className="flex items-center gap-3 px-4 py-3">
              {done ? (
                <span className="badge badge-ok">
                  <span className="dot" />
                  Settled
                </span>
              ) : (
                <span className="vd-spin" aria-hidden="true" />
              )}
              <div>
                <div className="text-[13px] font-medium">{done ? "$250.00 USDG to @marketfeed" : "Verifying ZK range proof and settling transfer"}</div>
                <div className="mt-0.5 text-[12px] text-fg-muted">{done ? "Confidential transfer, amount hidden from observers." : "This usually takes a moment."}</div>
              </div>
            </div>
          </section>

          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="font-medium">Pipeline</span>
                <span className="t-mono text-fg-faint">7f3a9c21</span>
              </div>
              {done && <span className="t-mono t-num text-[12px] text-ok">1.84s</span>}
            </div>
            <div className="t-mono flex h-[262px] flex-col bg-ink-1/60 px-4 py-3 text-[11.5px] leading-[17px]">
              {lines.map((l, i) => (
                <div key={i} className={cn("whitespace-pre-wrap break-all", logTone(l))}>
                  {l || " "}
                </div>
              ))}
              {!done && <div className="vd-block text-signal">▋</div>}
            </div>
            <div
              className="flex items-center justify-between gap-3 border-t border-line px-4 py-3"
              style={{ opacity: glow, visibility: done ? "visible" : "hidden" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="badge badge-ok">
                    <span className="dot" />
                    Settled
                  </span>
                  <span className="text-[12px] text-fg-muted">Transaction hash</span>
                </div>
                <div className="t-mono mt-1 truncate text-[12px] text-fg-body">4kQd9vN2pXr7Lw2dHn4s1fE9mT3cB8aY7RtV</div>
              </div>
              <span className="btn btn-secondary btn-sm">View receipt</span>
            </div>
          </section>
        </div>
        <Summary picked amount={250} />
      </div>
    </Shell>
  );
}

/* ── Step 4: Cards. Generate a card, reveal its CVV. ─────────────────────── */

const C_FOCUS = 0.7;
const C_TYPE = [0.9, 1.5] as const;
const C_GEN = 2.15;
const C_MADE = [2.95, 3.85] as const;
const C_CVV = 5.1;

function CardFace({ last4, holder, network, cvv, reveal = 1 }: { last4: string; holder: string; network: "visa" | "mastercard"; cvv: string; reveal?: number }) {
  const label = "font-mono uppercase tracking-[0.14em] text-white/55";
  return (
    <div className="relative aspect-[938/587] w-full">
      {/* while generating: a dim, blurred copy under the card as it draws in */}
      {reveal < 1 && (
        <div
          className="absolute inset-0 rounded-[14px] bg-[length:100%_100%]"
          style={{ backgroundImage: "url(/images/card-face-plain.png)", filter: "blur(10px) brightness(0.5) saturate(0.4)", transform: "scale(1.04)", opacity: 0.8 }}
        />
      )}
      <div
        className="elev-lg absolute inset-0 flex flex-col overflow-hidden rounded-[14px] bg-[#14131f] bg-[length:100%_100%] px-5 pb-5 pt-[18px]"
        style={{
          backgroundImage: "url(/images/card-face-plain.png)",
          clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`,
          filter: reveal < 1 ? "none" : undefined,
        }}
      >
        <span className={`${label} text-[9px]`}>Debit · Virtual</span>
        <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className="absolute left-[26%] top-[44%] w-[16px] -translate-y-1/2">
          <path d="M5 3.5C7.5 6.5 7.5 11.5 5 14.5M8.5 2C11.8 6 11.8 12 8.5 16M12 0.5c4 5 4 12 0 17" stroke="rgba(232,236,242,0.5)" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <div className="flex-1" />
        <div className="t-mono t-num flex justify-between text-[18px] tracking-[2px]">
          {["••••", "••••", "••••", last4].map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className={`${label} text-[7.5px]`}>Cardholder</div>
            <div className="mt-0.5 text-[12px] font-medium uppercase tracking-[0.06em]">{holder}</div>
          </div>
          <div>
            <div className={`${label} text-[7.5px]`}>Expires</div>
            <div className="t-mono mt-0.5 text-[12px]">11/30</div>
          </div>
          <div>
            <div className={`${label} text-[7.5px]`}>CVV</div>
            <div className="t-mono mt-0.5 text-[12px]">{cvv}</div>
          </div>
          {network === "visa" ? (
            <span className="text-[16px] font-extrabold italic">VISA</span>
          ) : (
            <svg viewBox="0 0 38 24" className="w-9" aria-hidden="true">
              <circle cx="14" cy="12" r="9" fill="#EB001B" />
              <circle cx="24" cy="12" r="9" fill="#F79E1B" fillOpacity="0.9" />
            </svg>
          )}
        </div>
        {/* the scan line drawing the card in */}
        {reveal > 0 && reveal < 1 && (
          <span className="absolute inset-x-0 h-[2px] bg-[rgba(226,218,255,0.9)] shadow-[0_0_12px_rgba(184,172,242,0.9)]" style={{ top: `${reveal * 100}%` }} />
        )}
      </div>
    </div>
  );
}

function CardActions({ cvvShown, aim }: { cvvShown: boolean; aim?: string }) {
  return (
    <div className="mt-2.5 flex items-center gap-1.5">
      <span data-aim={aim} className="btn btn-secondary btn-sm !h-8 !text-[12px]">
        {cvvShown ? "Hide CVV" : "Reveal CVV"}
      </span>
      <span className="btn btn-secondary btn-sm !h-8 !text-[12px]">Freeze</span>
      <span className="btn btn-ghost btn-sm ml-auto !h-8 !text-[12px] !text-danger/80">Remove</span>
    </div>
  );
}

function CardsStep({ t }: { t: number }) {
  const holder = typed("Ada Okafor", t, ...C_TYPE);
  const focused = t >= C_FOCUS && t < C_GEN;
  const generating = t >= C_GEN + 0.08 && t < C_MADE[0];
  const made = t >= C_MADE[0];
  const reveal = ease(t, ...C_MADE);
  const cvvShown = t >= C_CVV + 0.08;
  return (
    <Shell active="Cards" title="Cards">
      <Head title="Cards" description="Virtual debit cards backed by your primary account. Spend anywhere, reveal details only when you need them." />
      <section className="surface mb-5 p-4">
        <h2 className="text-[13.5px] font-semibold">Generate a new card</h2>
        <p className="mt-0.5 text-[12px] text-fg-muted">Card numbers are generated instantly and can be frozen or removed at any time.</p>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <div className="field-label !text-[12.5px]">Cardholder name</div>
            <div
              data-aim="holder"
              className={cn("input flex !h-9 items-center !text-[13px]", focused && "!border-signal/40 shadow-[0_0_0_3px_rgba(184,172,242,0.16)]")}
            >
              {holder && t < C_MADE[0] ? <span>{holder}</span> : <span className="text-fg-faint">Name as it appears on the card</span>}
              {focused && <span className="vd-caret" />}
            </div>
          </div>
          <div>
            <div className="field-label !text-[12.5px]">Network</div>
            <div className="segmented">
              <button type="button" aria-pressed="true">
                <span className="font-extrabold italic">VISA</span> Visa
              </button>
              <button type="button">Mastercard</button>
            </div>
          </div>
          <span data-aim="generate" className={cn("btn btn-primary btn-sm !h-9 !px-4", generating && "opacity-70")}>
            {generating ? "Generating..." : "Generate card"}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-5 pr-[120px]">
        <div>
          <CardFace last4="1092" holder="Ada Okafor" network="mastercard" cvv="•••" />
          <CardActions cvvShown={false} />
        </div>
        {/* the new card draws in beside the existing one */}
        <div style={{ opacity: made ? 1 : 0 }}>
          <CardFace last4="3049" holder="Ada Okafor" network="visa" cvv={cvvShown ? "482" : "•••"} reveal={reveal} />
          <div style={{ opacity: ease(t, C_MADE[1] - 0.1, C_MADE[1] + 0.4) }}>
            <CardActions cvvShown={cvvShown} aim="cvv" />
          </div>
        </div>
      </div>

      <AimCursor
        t={t}
        path={[
          [0, 0, [1000, 640]],
          [0.15, 0.6, "holder"],
          [1.6, 2.05, "generate"],
          [3.0, 3.7, [1040, 520]],
          [4.4, 5.0, "cvv"],
          [5.8, 6.6, [1060, 640]],
        ]}
        clicks={[C_FOCUS, C_GEN, C_CVV]}
      />
    </Shell>
  );
}

/* ── The window ───────────────────────────────────────────────────────────── */

const STEPS: Step[] = [
  { id: "accounts", name: "See balances", dur: 6, View: AccountsStep },
  { id: "send", name: "Pay a handle", dur: 7.5, View: SendStep },
  { id: "settle", name: "Settle", dur: 5.5, View: SettleStep },
  { id: "cards", name: "Make a card", dur: 7, View: CardsStep },
];

export function AppDemo({ start }: { start?: { i: number; t: number } }) {
  return <StepWindow steps={STEPS} address="useveiled.com/app" label="The Veiled app" stageClass="vd-stage" threshold={0.15} start={start} />;
}
