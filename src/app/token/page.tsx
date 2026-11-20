import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "$VEILED Token | Veiled",
  description:
    "What $VEILED does: hold and stake the token to cut protocol fees on confidential transfers and agent payments, with staking counted at full weight and governance on the roadmap.",
};

const TOKEN_ADDRESS = "";

const UTILITIES = [
  {
    title: "Fee discounts",
    body:
      "The core utility. Protocol fees start at 0.10% per confidential transfer, capped at 5 USDG. The more $VEILED an account is tied to, the less it pays: up to 75% off, enforced by the fee controller on-chain.",
  },
  {
    title: "Staking",
    body:
      "Stake into the on-chain staking vault and every token counts at full weight toward your discount tier. Tokens merely held in your wallet still count, at half weight. Loyalty is measured by the chain, not by a points program.",
  },
  {
    title: "Agent fee coverage",
    body:
      "Your agents inherit your discount. When an agent account settles an x402 payment, the protocol prices its fee against the owning profile's $VEILED weight, so one treasury position lowers costs across your whole fleet.",
  },
  {
    title: "Governance and rebates",
    body:
      "On the roadmap: DAO-governed protocol parameters and fee rebates for long-term holders. The protocol's dials move outward, into the hands of the people and agents who use it.",
  },
];

const TIERS = [
  { tier: "Tier 1", weight: "1,000", discount: "10% off", fee: "0.090%" },
  { tier: "Tier 2", weight: "10,000", discount: "25% off", fee: "0.075%" },
  { tier: "Tier 3", weight: "100,000", discount: "50% off", fee: "0.050%" },
  { tier: "Tier 4", weight: "1,000,000", discount: "75% off", fee: "0.025%" },
];

export default function TokenPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-[1120px] px-4 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <header className="max-w-[780px]">
          <span className="badge badge-ok">
            <span className="pulse-dot size-1.5!" aria-hidden="true" />
            Live on Solana
          </span>
          <h1 className="mt-5 text-[clamp(36px,5.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em] text-fg">
            $VEILED. Loyalty that lowers the cost of privacy.
          </h1>
          <p className="t-lead mt-5 max-w-[660px]">
            One token, one job: the more of the protocol your accounts are tied to, the less the protocol charges you.
            Hold it, stake it, and watch every confidential transfer and every agent payment get cheaper, with the
            discount enforced on-chain rather than promised in a pricing page.
          </p>

          <div className="mt-8 max-w-[660px]">
            <div className="text-[13px] font-medium text-fg-muted">Token mint</div>
            <div className="well t-mono mt-2 break-all px-3.5 py-2.5 text-[13px] text-fg-body">
              {TOKEN_ADDRESS || <span className="text-fg-faint">Not published yet</span>}
            </div>
            <p className="t-small mt-2">Always verify the address against official Veiled channels before interacting.</p>
          </div>
        </header>

        <section aria-labelledby="utility-heading" className="mt-20 sm:mt-24">
          <h2 id="utility-heading" className="t-h2 text-[clamp(26px,3.2vw,36px)]">
            What the token does
          </h2>
          <dl className="divided mt-8 max-w-[960px] border-y border-line">
            {UTILITIES.map((u) => (
              <div key={u.title} className="grid grid-cols-1 gap-2 py-6 md:grid-cols-[240px_1fr] md:gap-8">
                <dt className="t-h3">{u.title}</dt>
                <dd className="t-body max-w-[640px]">{u.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="tiers-heading" className="mt-20 sm:mt-24">
          <h2 id="tiers-heading" className="t-h2 text-[clamp(26px,3.2vw,36px)]">
            Discount tiers
          </h2>
          <p className="t-body mt-3 max-w-[640px]">
            Your tier is set by loyalty weight: staked $VEILED counts at 100%, held $VEILED counts at 50%.
          </p>

          <div className="surface mt-8 max-w-[860px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[480px]">
                <thead>
                  <tr>
                    <th scope="col">Tier</th>
                    <th scope="col" className="text-right">$VEILED weight</th>
                    <th scope="col">Discount</th>
                    <th scope="col" className="text-right">Effective fee</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.tier}>
                      <td className="font-medium text-fg">{t.tier}</td>
                      <td className="t-mono t-num text-right">{t.weight}</td>
                      <td>
                        <span className="badge badge-signal">{t.discount}</span>
                      </td>
                      <td className="t-mono t-num text-right">{t.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="t-body mt-6 max-w-[760px]">
            The base fee is 0.10% per confidential transfer, capped at 5 USDG, and every discount is applied
            automatically by the on-chain fee controller. Stake 10,000 $VEILED and every transfer you or your agents
            make is priced at 0.075% from the next block onward. No coupons, no sales calls, no fine print.
          </p>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn btn-primary btn-lg">
            Open your account
          </Link>
          <Link href="/roadmap" className="btn btn-ghost btn-lg">
            See the roadmap
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
