import Link from "next/link";
import Image from "next/image";

interface FooterColumn {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
}

const columns: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "App", href: "/app" },
      { label: "Sign up", href: "/signup" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "$VEILED Token", href: "/token" },
      { label: "On-chain programs", href: "https://docs.useveiled.com/under-the-hood/solana-program" },

    ],
  },
  {
    heading: "Features",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Confidential transfers", href: "/#privacy" },
      { label: "Agent accounts", href: "/#accounts" },
      { label: "For builders", href: "/#for-builders" },
      { label: "For teams", href: "/#for-teams" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: "https://docs.useveiled.com/", external: true },
      { label: "The Veiled Model", href: "https://docs.useveiled.com/start-here/the-veiled-model", external: true },
      { label: "API Reference", href: "https://docs.useveiled.com/developer-api/making-requests", external: true },
      { label: "Agent Accounts", href: "https://docs.useveiled.com/autonomous-agents/agent-wallets", external: true },
      { label: "System Design", href: "https://docs.useveiled.com/under-the-hood/system-design", external: true },
      { label: "Beta Access", href: "/signup" },
      { label: "FAQ", href: "https://docs.useveiled.com/help/common-questions", external: true },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact", href: "mailto:contact@useveiled.com" },
      { label: "X (Twitter)", href: "https://x.com/useveiled" },
      { label: "GitHub", href: "https://github.com/useveiled" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-14 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 lg:grid-cols-12">
          <div className="col-span-2 sm:col-span-4 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Veiled home">
              <Image src="/images/logo.png" alt="" width={28} height={28} />
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-fg">Veiled</span>
            </Link>
            <p className="t-small mt-3 max-w-[280px]">Private banking on Solana for humans and their AI agents.</p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="lg:col-span-2">
              <h2 className="text-[13px] font-medium text-fg">{col.heading}</h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-[13.5px] text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-[12.5px] text-fg-faint">
          <span>© {new Date().getFullYear()} Veiled</span>
          <span className="inline-flex items-center gap-2">
            <span className="pulse-dot" aria-hidden="true" />
            <Link href="/status" className="transition-colors hover:text-fg">System status</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
