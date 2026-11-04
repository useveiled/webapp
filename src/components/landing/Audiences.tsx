"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type TabId = "for-you" | "for-builders" | "for-teams";

const TABS: { id: TabId; label: string }[] = [
  { id: "for-you", label: "For you" },
  { id: "for-builders", label: "For agent builders" },
  { id: "for-teams", label: "For teams" },
];

const SDK_SAMPLE = `import { Veiled } from "@useveiled/sdk";

const veiled = new Veiled({ apiKey: process.env.VEILED_API_KEY! });

const agent = await veiled.agents.create({
  name: "research-bot",
  spendPolicy: {
    dailyLimitUsdg: 500,
    perTransactionLimitUsdg: 50,
    allowedRecipients: ["api.market", "*.anthropic.com"],
    assets: ["USDG"],
    hitlThresholdUsdg: 25, // at or above this, wait for approval
  },
});`;

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="py-4">
      <div className="text-[15px] font-medium text-fg">{title}</div>
      <p className="t-small mt-1">{children}</p>
    </li>
  );
}

export function Audiences() {
  const [active, setActive] = useState<TabId>("for-you");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ "for-you": null, "for-builders": null, "for-teams": null });

  // Deep links: /#for-builders opens that tab.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === h)) setActive(h);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(id: TabId, focus = false) {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === active);
    if (e.key === "ArrowRight") select(TABS[(i + 1) % TABS.length].id, true);
    else if (e.key === "ArrowLeft") select(TABS[(i - 1 + TABS.length) % TABS.length].id, true);
    else return;
    e.preventDefault();
  }

  return (
    <div>
      <div className="segmented max-w-full overflow-x-auto" role="tablist" aria-label="Who Veiled is for" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={t.id}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            className="shrink-0 !h-9 !px-4 !text-[14px]"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {/* For you */}
        <div id="for-you" role="tabpanel" aria-labelledby="tab-for-you" hidden={active !== "for-you"} className="scroll-mt-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="t-lead">
                A checking account whose balance is nobody&apos;s business, a card to spend it with, and a safe way to give your agents an allowance.
              </p>
              <Link href="/signup" className="btn btn-primary mt-6">
                Open an account
              </Link>
            </div>
            <ul className="divided border-y border-line lg:col-span-6 lg:col-start-7">
              <Point title="Pay a handle, not an address">Send to @ada.veiled. Settlement lands on Solana in under a second.</Point>
              <Point title="Spend anywhere cards work">Virtual Visa and Mastercard debit cards draw on your confidential balance.</Point>
              <Point title="Fund agents with a mandate">Set a daily limit and an approval threshold, then let them work.</Point>
            </ul>
          </div>
        </div>

        {/* For builders */}
        <div id="for-builders" role="tabpanel" aria-labelledby="tab-for-builders" hidden={active !== "for-builders"} className="scroll-mt-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="t-lead">
                Give an agent its own account and a hard mandate in one call. The policy compiles to smart-account constraints, so it holds even if your server doesn&apos;t.
              </p>
              <ul className="divided mt-6 border-y border-line">
                <Point title="Test on devnet first">
                  <span className="t-mono text-fg-body">vl_test_</span> keys run on Solana devnet; no real funds move.
                </Point>
                <Point title="Safe retries">Every write carries an idempotency key, so a retry never pays twice.</Point>
                <Point title="Signed webhooks">Hear about settlements the moment they land, and verify each delivery.</Point>
              </ul>
              <a href="https://docs.useveiled.com/autonomous-agents/agent-wallets" target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-6">
                Agent account docs
              </a>
            </div>
            <figure className="glass border-gradient min-w-0 overflow-hidden rounded-[18px] lg:col-span-7">
              <figcaption className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="t-mono text-[12.5px] text-fg-muted">create-agent.ts</span>
                <span className="t-mono text-[12px] text-fg-faint">@useveiled/sdk</span>
              </figcaption>
              <pre className="t-mono overflow-x-auto p-4 text-[12.5px] leading-[1.7] text-fg-body sm:p-5">
                <code>{SDK_SAMPLE}</code>
              </pre>
            </figure>
          </div>
        </div>

        {/* For teams */}
        <div id="for-teams" role="tabpanel" aria-labelledby="tab-for-teams" hidden={active !== "for-teams"} className="scroll-mt-28">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="t-lead">
                Run payroll, vendors, and a fleet of agents without publishing your burn rate to every competitor with a block explorer.
              </p>
              <a href="mailto:contact@useveiled.com" className="btn btn-primary mt-6">
                Talk to us
              </a>
            </div>
            <ul className="divided border-y border-line lg:col-span-6 lg:col-start-7">
              <Point title="Multisig vaults">Treasury moves only when enough signers agree, through Squads.</Point>
              <Point title="One policy per agent">Each agent gets its own account, limits, and allowlist, so one bad prompt can&apos;t drain the rest.</Point>
              <Point title="Audits without exposure">View keys give your accountant read access to exactly what you choose.</Point>
              <Point title="Enterprise tier">Bulk agent deployment and a compliance API are planned for v1.5.</Point>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
