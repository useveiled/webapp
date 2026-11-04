import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Fingerprint, Route, Webhook, KeyRound, AtSign } from "lucide-react";
import { Audiences } from "@/components/landing/Audiences";
import { PaymentStage } from "@/components/landing/PaymentStage";
import { SectionImage } from "@/components/landing/SectionImage";
import { publicImage } from "@/lib/public-image";

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1200px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

function SectionHead({ title, body, id }: { title: ReactNode; body?: ReactNode; id?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <h2 id={id} className="t-h2 lg:col-span-6">
        {title}
      </h2>
      {body && <p className="t-body lg:col-span-5 lg:col-start-8 lg:pt-2">{body}</p>}
    </div>
  );
}

/* ── Privacy: what the chain sees ─────────────────────────────────────── */

const LEDGER = [
  { label: "From", plain: "9wTb…kE2m", veiled: "9wTb…kE2m" },
  { label: "To", plain: "Hn4s…pX7c", veiled: "Hn4s…pX7c" },
  { label: "Amount", plain: "12,500.00 USDC", veiled: "e7c2 1f90 4ab8 03dd", hidden: true },
  { label: "Sender balance", plain: "248,902.17 USDC", veiled: "91be 5c3a f0d4 6e27", hidden: true },
  { label: "Receiver balance", plain: "3,410.55 USDC", veiled: "c4a0 7d13 2b9e 8f61", hidden: true },
];

function LedgerCard({ variant }: { variant: "plain" | "veiled" }) {
  const veiled = variant === "veiled";
  return (
    <figure className={veiled ? "glass border-gradient rounded-[18px] p-5 sm:p-6" : "surface rounded-[18px] !bg-ink-1/90 p-5 sm:p-6"}>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium text-fg">{veiled ? "A Veiled transfer" : "A standard token transfer"}</span>
        {veiled ? <span className="badge badge-signal">Confidential</span> : <span className="badge badge-warn">Public</span>}
      </figcaption>
      <dl className="divided mt-4">
        {LEDGER.map((row) => {
          const encrypted = veiled && row.hidden;
          return (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-fg-muted">{row.label}</dt>
              <dd className={encrypted ? "cipher text-[12.5px]" : "t-mono t-num text-[13px] text-fg"}>
                {veiled ? row.veiled : row.plain}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-4 text-[13px] leading-relaxed text-fg-muted">
        {veiled
          ? "Amounts and balances are encrypted on your device and proven valid with zero-knowledge proofs. Validators order ciphertext."
          : "Anyone with a block explorer can read what you paid, who you paid, and what you have left."}
      </p>
    </figure>
  );
}

export function PrivacySection() {
  return (
    <section id="privacy" className="relative isolate scroll-mt-24 py-20 sm:py-24">
      <SectionImage src={publicImage("bg-privacy.jpg")} opacity={0.5} position="center 40%" />
      <Container>
        <SectionHead
          title="On a public chain, every payment is a disclosure."
          body="Solana is fast and cheap, and completely transparent. Veiled builds on Token-2022 confidential balances, so the amounts that make up your financial life stop being public record."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <LedgerCard variant="plain" />
          <LedgerCard variant="veiled" />
        </div>

        <div className="mt-12 grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="t-h3 text-[16px]">Confidential by default</h3>
              <span className="badge badge-ok">Live</span>
            </div>
            <p className="t-small mt-2">
              Every account starts confidential. Public transfers are opt-in, for when a counterparty needs to verify.
            </p>
          </div>
          <div>
            <h3 className="t-h3 text-[16px]">Disclosure you control</h3>
            <p className="t-small mt-2">
              Hand an auditor a view key and they read exactly what you choose. Nothing reaches the public, and custody never moves.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="t-h3 text-[16px]">Shielded state</h3>
              <span className="badge">Up next</span>
            </div>
            <p className="t-small mt-2">
              Merkle-committed balances and stealth addresses, so recipients are unlinkable too. On the{" "}
              <Link href="/roadmap" className="text-fg-body underline decoration-line-strong underline-offset-4 hover:text-fg">
                roadmap
              </Link>{" "}
              for v1.0.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── Accounts: humans and agents side by side ─────────────────────────── */

function PolicyRow({ label, value, meter }: { label: string; value: string; meter?: number }) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] text-fg-muted">{label}</span>
        <span className="t-mono t-num text-[13px] text-fg">{value}</span>
      </div>
      {meter !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
          <div className="h-full rounded-full bg-signal" style={{ width: `${meter}%` }} />
        </div>
      )}
    </div>
  );
}

export function AccountsSection() {
  return (
    <section id="accounts" className="scroll-mt-24 py-20 sm:py-24">
      <Container>
        <SectionHead
          title="Your account, and an account for every agent you run."
          body="Agents get their own confidential accounts with a hard mandate. Limits are smart-account constraints checked on-chain, so an agent can't outspend its policy and a compromised server can't bypass it."
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {/* Human account */}
          <div className="surface rounded-[18px] p-5 sm:p-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-fg text-[13px] font-semibold text-ink-0">A</span>
              <div>
                <div className="text-[14px] font-medium text-fg">Ada Okafor</div>
                <div className="t-mono text-[12.5px] text-fg-muted">@ada.veiled</div>
              </div>
              <span className="badge ml-auto">Human</span>
            </div>
            <div className="well mt-5 p-4">
              <div className="text-[12.5px] text-fg-muted">Balance</div>
              <div className="t-mono mt-1 text-[22px] tracking-[0.12em] text-fg-faint">•••••••</div>
              <div className="mt-1 text-[12px] text-fg-faint">Decrypted only on your device</div>
            </div>
            <div className="divided mt-4">
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-fg-muted">Recovery</span>
                <span className="text-fg-body">2 of 3 multisig</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-fg-muted">Custody</span>
                <span className="text-fg-body">Your keys</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-fg-muted">Agents funded</span>
                <span className="t-num text-fg-body">3</span>
              </div>
            </div>
          </div>

          {/* Agent account with policy */}
          <div className="surface rounded-[18px] p-5 sm:p-6 lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-white/[0.06] text-[13px] font-semibold text-fg">R</span>
              <div>
                <div className="text-[14px] font-medium text-fg">research-bot</div>
                <div className="t-mono text-[12.5px] text-fg-muted">research-bot.veiled</div>
              </div>
              <span className="badge badge-ok ml-auto">
                <span className="dot" />
                Active
              </span>
            </div>

            <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
              <div className="divided">
                <PolicyRow label="Spent today" value="212 / 500 USDG" meter={42} />
                <PolicyRow label="Per transaction" value="≤ 50 USDG" />
                <PolicyRow label="Active hours" value="00:00 to 23:59" />
              </div>
              <div className="divided">
                <div className="py-2.5">
                  <div className="text-[13px] text-fg-muted">Allowed recipients</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="badge t-mono">api.market</span>
                    <span className="badge t-mono">*.anthropic.com</span>
                  </div>
                </div>
                <PolicyRow label="Needs your approval at" value="≥ 25 USDG" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-warn/20 bg-warn/[0.06] px-4 py-3">
              <div className="min-w-0 text-[13px]">
                <span className="text-fg">Held for approval: </span>
                <span className="t-mono text-fg-body">38.00 USDG to api.market</span>
              </div>
              <div className="flex gap-2">
                <span className="btn btn-secondary btn-sm pointer-events-none">Decline</span>
                <span className="btn btn-primary btn-sm pointer-events-none">Approve</span>
              </div>
            </div>
            <p className="mt-3 text-[12px] text-fg-faint">Illustrative account. The agent runs on its own; you stay the final authority.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── How an agent pays: the x402 flow, step by step ───────────────────── */

export function AgentPaysSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
      <Container>
        <SectionHead
          title="How an agent pays, from request to receipt."
          body="An API asks for payment, the agent's policy is checked on-chain, the amount is encrypted before it leaves, and the transfer settles on Solana. Switch the record to the public chain view to see what an observer gets."
        />
        <div className="mt-12">
          <PaymentStage />
        </div>
      </Container>
    </section>
  );
}

/* ── Capabilities ─────────────────────────────────────────────────────── */

const CAPABILITIES = [
  {
    icon: CreditCard,
    title: "Virtual cards",
    body: "Visa and Mastercard debit cards backed by your confidential balance. Freeze or reveal details on demand.",
  },
  {
    icon: Fingerprint,
    title: "x402 payments",
    body: "Agents resolve HTTP 402 payment requests against their own balance, inside policy, with no human in the loop.",
  },
  {
    icon: Route,
    title: "Multi-path routing",
    body: "MPP splits a payment across parallel routes in one atomic Solana transaction: every path lands or none do.",
  },
  {
    icon: Webhook,
    title: "SDK, API, webhooks",
    body: "A typed TypeScript SDK over the REST API, idempotent writes, and signed webhooks the moment a transfer settles.",
  },
  {
    icon: KeyRound,
    title: "Non-custodial recovery",
    body: "Smart accounts on program-derived addresses, with Squads multisig for social recovery and key rotation.",
  },
  {
    icon: AtSign,
    title: ".veiled handles",
    body: "Pay @ada.veiled instead of a 44-character address. Each handle resolves to a deterministic account.",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <SectionHead title="Everything a bank account does, without the audience." />
        <div className="mt-12 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="border-b border-line py-7 sm:pr-8 lg:[&:nth-child(3n+2)]:px-8 lg:[&:nth-child(3n)]:pl-8 lg:[&:nth-child(3n+2)]:border-x">
              <div className="flex items-center gap-2.5">
                <Icon className="size-4 text-fg-muted" strokeWidth={1.6} aria-hidden="true" />
                <h3 className="text-[15px] font-medium text-fg">{title}</h3>
              </div>
              <p className="t-small mt-2 max-w-[340px]">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Audiences ────────────────────────────────────────────────────────── */

export function AudienceSection() {
  return (
    <section id="builders" className="scroll-mt-24 py-20 sm:py-24">
      <Container>
        <SectionHead title="Built for the people and the code that move your money." />
        <div className="mt-10">
          <Audiences />
        </div>
      </Container>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */

const FAQ = [
  {
    q: "Does Veiled hold my funds?",
    a: "No. Accounts are non-custodial smart accounts on Solana. You hold the keys, and recovery runs through a multisig you control, not through us.",
  },
  {
    q: "What exactly is hidden, and what isn't?",
    a: "Transfer amounts and balances are encrypted with Token-2022 confidential balances. Sender and recipient addresses are still visible on-chain today. Shielded state with stealth addresses, which unlinks recipients too, is the next privacy layer on the roadmap.",
  },
  {
    q: "Can Veiled see my balance?",
    a: "No. Amounts are encrypted on your device and our servers can't decrypt them. API responses never include a plaintext amount; reading one requires your account key.",
  },
  {
    q: "How do I stop an agent from overspending?",
    a: "Each agent account has a spend policy: a daily limit, a per-transaction limit, allowed recipients, assets, active hours, and an approval threshold above which payments wait for you. The policy is enforced by the smart account on-chain.",
  },
  {
    q: "Which assets are supported?",
    a: "USDG and USDC, both issued natively on Solana, plus SOL. Agents settle x402 payments in the same assets.",
  },
  {
    q: "Can I share records with an accountant or auditor?",
    a: "Yes. A view key lets someone read the transactions you choose without gaining any ability to move funds, and without anything becoming public.",
  },
  {
    q: "Is it live?",
    a: "Veiled is in beta on Solana. Confidential transfers, agent accounts, x402, MPP routing, the SDK, and virtual cards are live now. A fiat on and off ramp and a mobile app are up next.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="t-h2">Questions</h2>
            <p className="t-small mt-3">
              More in the{" "}
              <a
                href="https://docs.useveiled.com/help/common-questions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-body underline decoration-line-strong underline-offset-4 hover:text-fg"
              >
                docs
              </a>
              .
            </p>
          </div>
          <div className="divided border-y border-line lg:col-span-8">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15.5px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                  {q}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 text-fg-faint transition-transform duration-200 group-open:rotate-45"
                  >
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="t-body max-w-[640px] pb-6 text-fg-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
