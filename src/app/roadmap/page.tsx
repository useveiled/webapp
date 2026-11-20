import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Roadmap | Veiled",
  description:
    "Where Veiled is headed: from confidential transfers and agent accounts live today to shielded state, multi-chain routing, full privacy, and DAO governance.",
};

type PhaseStatus = "live" | "next" | "planned";

const PHASES: {
  tag: string;
  status: PhaseStatus;
  title: string;
  description: string;
  items: string[];
}[] = [
  {
    tag: "Beta · Live now",
    status: "live",
    title: "The private core",
    description:
      "The foundation is live today: confidential money that humans and agents already use.",
    items: [
      "Confidential transfers with encrypted amounts and ZK range proofs",
      "Agent accounts with on-chain spend policies",
      "Native x402 payments and MPP routing",
      "Agent SDK and REST API with webhooks",
      "Virtual Visa and Mastercard debit cards",
      "$VEILED live on Solana with staking fee discounts",
    ],
  },
  {
    tag: "v1.0 · Up next",
    status: "next",
    title: "Banking for everyone",
    description:
      "The bridge between the old rails and the new: money in, money out, privacy the whole way through.",
    items: [
      "Fiat on and off ramp",
      "Mobile app",
      "Layer 3 shielded state: Merkle-committed balances and stealth addresses",
    ],
  },
  {
    tag: "v1.5 · Planned",
    status: "planned",
    title: "Enterprise and interop",
    description:
      "The private financial layer grows beyond a single chain and into serious organizations.",
    items: [
      "Enterprise tier with bulk agent deployment",
      "Compliance API for view-key based disclosure at scale",
      "Cross-chain routing: Ethereum, Base",
    ],
  },
  {
    tag: "v2.0 · Planned",
    status: "planned",
    title: "Full privacy",
    description:
      "The endgame for confidentiality: entire account states shielded, with compliance still provable on demand.",
    items: [
      "Layer 4 full privacy for verified enterprise accounts",
      "Shielded pools with association sets",
      "DeFi yield integration on idle USDG balances",
    ],
  },
  {
    tag: "Future · Exploring",
    status: "planned",
    title: "Protocol, owned by its users",
    description:
      "Control of the protocol moves outward, to the people and agents who run on it.",
    items: [
      "DAO-governed protocol parameters",
      "Expanded $VEILED governance and fee rebates",
    ],
  },
];

const BADGE: Record<PhaseStatus, string> = {
  live: "badge badge-ok",
  next: "badge badge-signal",
  planned: "badge",
};

const NODE: Record<PhaseStatus, string> = {
  live: "border-ok bg-ok",
  next: "border-signal bg-ink-0",
  planned: "border-line-strong bg-ink-0",
};

export default function RoadmapPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-[1120px] px-4 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <header className="max-w-[760px]">
          <h1 className="text-[clamp(36px,5.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em] text-fg">
            Building the financial layer of the agent economy.
          </h1>
          <p className="t-lead mt-5 max-w-[640px]">
            Privacy shipped first. Everything that follows widens who can use it: from crypto-native builders today to
            every human and every agent with money to move. Here is where Veiled goes next.
          </p>
        </header>

        <section aria-label="Roadmap phases" className="surface mt-12 max-w-[860px] px-5 py-2 sm:mt-16 sm:px-8">
          <ol className="relative">
            <span aria-hidden="true" className="absolute bottom-10 left-[5px] top-10 w-px bg-line-strong" />
            {PHASES.map((phase, i) => {
              const [version, label] = phase.tag.split(" · ");
              return (
                <li
                  key={phase.tag}
                  className={`relative pl-8 py-7 sm:pl-10 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-[34px] size-[11px] rounded-full border-2 ${NODE[phase.status]}`}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="t-mono text-[13px] text-fg-muted">{version}</span>
                    <span className={BADGE[phase.status]}>
                      {phase.status === "live" && <span className="dot" />}
                      {label ?? phase.tag}
                    </span>
                  </div>
                  <h2 className="t-h3 mt-3 text-[20px]">{phase.title}</h2>
                  <p className="t-body mt-1.5 max-w-[600px] text-fg-muted">{phase.description}</p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14.5px] leading-relaxed text-fg-body">
                        <span
                          aria-hidden="true"
                          className={`mt-[9px] size-1 shrink-0 rounded-full ${
                            phase.status === "live" ? "bg-ok" : "bg-fg-faint"
                          }`}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="t-small mt-6 max-w-[860px]">
          The roadmap reflects current direction and ships when it is ready, not on a fixed date.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Join the beta
          </Link>
          <Link href="/token" className="btn btn-ghost btn-lg">
            Explore $VEILED
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
