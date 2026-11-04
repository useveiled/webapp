import type { ReactNode } from "react";

interface SubItem {
  number: string;
  label: string;
  href: string;
}

export interface FeatureSectionProps {
  sectionNumber: string;
  sectionLabel: string;
  sectionHref: string;
  heading: string;
  description: string;
  subItems: SubItem[];
  mockup: ReactNode;
  layout?: "side" | "below";
  className?: string;
}

export function FeatureSection({
  sectionNumber,
  sectionLabel,
  sectionHref,
  heading,
  description,
  subItems,
  mockup,
  layout = "side",
  className,
}: FeatureSectionProps) {
  const headingLines = heading.split("\n");

  const textBlock = (
    <div className={layout === "below" ? "lg:w-[52%]" : "flex-shrink-0 lg:w-[40%] pr-0 lg:pr-16"}>
      <div className="fx-overline" style={{ marginBottom: "16px" }}>
        {sectionNumber} / {sectionLabel}
      </div>
      <h2
        style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 510,
          lineHeight: "1.15",
          letterSpacing: "-1.056px",
          color: "rgb(247, 248, 248)",
        }}
      >
        {headingLines.map((line, i) => (
          <span key={i}>
            {line}
            {i < headingLines.length - 1 && <br />}
          </span>
        ))}
      </h2>

      <p
        style={{
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "26px",
          color: "rgb(138, 143, 152)",
          marginTop: "24px",
          maxWidth: "420px",
        }}
      >
        {description}
      </p>

      <a
        href={sectionHref}
        className="inline-flex items-center hover:opacity-80 transition-opacity"
        style={{ marginTop: "32px", gap: "8px" }}
      >
        <span style={{ fontSize: "13px", color: "rgb(138, 143, 152)", fontWeight: 400 }}>
          {sectionNumber}
        </span>
        <span style={{ fontSize: "13px", color: "rgb(247, 248, 248)", fontWeight: 400 }}>
          {sectionLabel}
        </span>
        <span style={{ fontSize: "13px", color: "rgb(247, 248, 248)", fontWeight: 400 }}>
          →
        </span>
      </a>
    </div>
  );

  return (
    <section
      id={sectionLabel.toLowerCase().replace(/\s*\(.*\)/, "").trim()}
      className={className}
      style={{ backgroundColor: "#15191A" }}
    >
      <div style={{ borderTop: "1px solid rgba(255,255,255,0)" }}>
        <div
          style={{
            maxWidth: "1392px",
            margin: "0 auto",
            padding: "clamp(56px, 10vw, 96px) clamp(20px, 6vw, 96px) 0",
          }}
        >
          {layout === "side" ? (
            /* Side layout: text left, mockup right */
            <div className="flex flex-col lg:flex-row lg:items-start">
              {textBlock}
              <div
                className="flex-1 mt-12 lg:mt-0"
                style={{ minHeight: "600px", position: "relative" }}
              >
                {mockup}
              </div>
            </div>
          ) : (
            /* Below layout: text top (constrained width), mockup full-width below */
            <div className="flex flex-col">
              {textBlock}
              <div style={{ marginTop: "56px", minHeight: "560px", position: "relative" }}>
                {mockup}
              </div>
            </div>
          )}
        </div>

        {subItems.length > 0 && (
          <div
            style={{
              maxWidth: "1392px",
              margin: "0 auto",
              padding: "40px clamp(20px, 6vw, 96px)",
              borderTop: "1px solid rgba(255,255,255,0)",
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {subItems.map((item) => (
              <a
                key={item.number}
                href={item.href}
                className="group transition-colors hover:border-[rgba(203,213,225,0.35)]"
                style={{
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "9999px",
                  padding: "7px 14px",
                  background: "rgba(255,255,255,0.02)",
                  transition: "border-color 0.15s ease",
                }}
              >
                <span
                  className="group-hover:text-[rgb(247,248,248)] transition-colors"
                  style={{ fontSize: "13px", color: "rgb(138, 143, 152)" }}
                >
                  <span style={{ marginRight: "6px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "rgba(203,213,225,0.7)" }}>{item.number}</span>
                  <span>{item.label}</span>
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Pre-configured section exports ────────────────────────────────────────

export const INTAKE_SECTION: Omit<FeatureSectionProps, "mockup"> = {
  sectionNumber: "1.0",
  sectionLabel: "Accounts",
  sectionHref: "/signup",
  heading: "One account.\nTwo kinds of principals.",
  description:
    "Human and agent accounts live side by side on one protocol: non-custodial, shielded by zero-knowledge proofs, and governed by spending policies the chain itself enforces. Your money answers to you, not to a database.",
  subItems: [
    { number: "1.1", label: "Human Accounts", href: "#" },
    { number: "1.2", label: "Agent Accounts", href: "#" },
    { number: "1.3", label: "Multi-sig Vaults", href: "#" },
    { number: "1.4", label: ".veiled Handles", href: "#" },
  ],
};

export const PLAN_SECTION: Omit<FeatureSectionProps, "mockup"> = {
  sectionNumber: "2.0",
  sectionLabel: "Privacy",
  sectionHref: "/signup",
  layout: "below",
  heading: "Confidential by default.\nAuditable by choice.",
  description:
    "Every amount is encrypted on your device and proven correct with zero-knowledge range proofs: invisible to observers, verifiable by anyone. When you choose to disclose, a view key reveals exactly what you intend and nothing else.",
  subItems: [
    { number: "2.1", label: "Confidential Amounts", href: "#" },
    { number: "2.2", label: "Shielded State", href: "#" },
    { number: "2.3", label: "ZK Range Proofs", href: "#" },
    { number: "2.4", label: "View Keys", href: "#" },
  ],
};

export const BUILD_SECTION: Omit<FeatureSectionProps, "mockup"> = {
  sectionNumber: "3.0",
  sectionLabel: "Agents",
  sectionHref: "/signup",
  heading: "AI agents that pay\nfor themselves.",
  description:
    "Agent accounts settle x402 payment requests entirely on their own, no human in the loop. Spending policies live on-chain, so an agent can never outspend its mandate, and MPP routing splits every payment to keep it private.",
  subItems: [
    { number: "3.1", label: "x402 Protocol", href: "#" },
    { number: "3.2", label: "Spending Policies", href: "#" },
    { number: "3.3", label: "Agent SDK", href: "#" },
    { number: "3.4", label: "MPP Routing", href: "#" },
    { number: "3.5", label: "Agent Hierarchies", href: "#" },
  ],
};

export const DIFFS_SECTION: Omit<FeatureSectionProps, "mockup"> = {
  sectionNumber: "4.0",
  sectionLabel: "Protocol",
  sectionHref: "/signup",
  layout: "below",
  heading: "Every transaction,\nrouted for privacy.",
  description:
    "Multi-Path Payments split each transfer across parallel routes, so no observer ever sees the whole picture. Settlement stays atomic, stealth addresses keep every receipt unlinkable, and surveillance is left with nothing to read.",
  subItems: [],
};

export const MONITOR_SECTION: Omit<FeatureSectionProps, "mockup"> = {
  sectionNumber: "5.0",
  sectionLabel: "Transparency",
  sectionHref: "/signup",
  heading: "Selective disclosure.\nFull verifiability.",
  description:
    "Every transaction is provably on-chain while its amount stays encrypted. Hand an auditor a view key and they read exactly what you allow: nothing reaches the public, and custody never leaves your hands.",
  subItems: [
    { number: "5.1", label: "On-chain Receipts", href: "#" },
    { number: "5.2", label: "Selective Disclosure", href: "#" },
    { number: "5.3", label: "Audit Exports", href: "#" },
  ],
};
