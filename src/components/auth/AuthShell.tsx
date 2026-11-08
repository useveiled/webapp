import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { publicImage } from "@/lib/public-image";
export { AuthHeading } from "./AuthHeading";

/* Split-screen auth layout. Left: the task (one form, nothing else).
   Right: a lit glass stage that shows what the account protects.
   The right panel uses bg-auth.jpg if present, else the homepage hero image,
   else a composed light falloff. */
export function AuthShell({
  children,
  aside,
  switchPrompt,
}: {
  children: ReactNode;
  aside: ReactNode;
  switchPrompt?: { text: string; label: string; href: string };
}) {
  const bg = publicImage("bg-auth.jpg") ?? publicImage("bg-hero.jpg");

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Task column */}
      <div className="flex min-h-screen flex-col px-5 py-5 sm:px-10 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-[10px]" aria-label="Veiled home">
            <Image src="/images/logo.png" alt="" width={30} height={30} priority />
            <span className="font-[family-name:var(--font-heading)] text-[18px] font-semibold tracking-[-0.01em] text-fg">Veiled</span>
          </Link>
          {switchPrompt && (
            <p className="text-[14px] text-fg-muted">
              <span className="hidden sm:inline">{switchPrompt.text} </span>
              <Link href={switchPrompt.href} className="btn btn-secondary btn-sm ml-1">
                {switchPrompt.label}
              </Link>
            </p>
          )}
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="veil-in w-full max-w-[400px]">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-fg-faint">
          <span>© {new Date().getFullYear()} Veiled</span>
          <a href="https://docs.useveiled.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg">
            Docs
          </a>
          <Link href="/status" className="inline-flex items-center gap-1.5 transition-colors hover:text-fg">
            <span className="pulse-dot !size-1.5" aria-hidden="true" />
            Status
          </Link>
          <a href="mailto:contact@useveiled.com" className="transition-colors hover:text-fg">
            Contact
          </a>
        </footer>
      </div>

      {/* Stage column */}
      <div className="hidden p-3 lg:block">
        <div className="border-gradient relative isolate flex h-full min-h-[640px] flex-col justify-end overflow-hidden rounded-[28px] bg-ink-1 p-10 xl:p-14">
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            {bg ? (
              <Image src={bg} alt="" fill quality={90} sizes="55vw" className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_0%,rgba(184,172,242,0.14),transparent_70%),radial-gradient(60%_50%_at_10%_100%,rgba(203,213,225,0.06),transparent_70%)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,9,0)_0%,rgba(6,7,9,0.15)_50%,rgba(6,7,9,0.55)_100%)]" />
          </div>
          {aside}
        </div>
      </div>
    </main>
  );
}

/* Right-stage content for login and the confirmed page: the same transfer,
   as you see it and as the chain records it. */
export function PrivateRecordAside() {
  const rows = [
    { label: "To", you: "marketfeed.veiled", chain: "3mPq…Lw2d" },
    { label: "Amount", you: "1,250.00 USDG", chain: "a3f1 9c0e 77b2 e41d", hidden: true },
    { label: "Balance after", you: "48,902.17 USDG", chain: "5d08 b6aa 2e19 c7f3", hidden: true },
  ];
  return (
    <div className="max-w-[560px]">
      <h2 className="t-h2 max-w-[460px]">Only you can read your balance.</h2>
      <p className="t-body mt-3 max-w-[440px]">
        Amounts are decrypted on your device. To everyone else, including validators and Veiled itself, they&apos;re ciphertext.
      </p>
      <div className="glass border-gradient mt-8 grid grid-cols-2 overflow-hidden rounded-[18px]">
        <div className="p-5">
          <div className="text-[12.5px] text-fg-muted">What you see</div>
          <dl className="divided mt-3">
            {rows.map((r) => (
              <div key={r.label} className="py-2.5">
                <dt className="text-[12px] text-fg-faint">{r.label}</dt>
                <dd className="t-mono t-num mt-0.5 truncate text-[13.5px] text-fg">{r.you}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border-l border-line bg-ink-0/40 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] text-fg-muted">What the chain shows</span>
            <span className="badge badge-signal">Encrypted</span>
          </div>
          <dl className="divided mt-3">
            {rows.map((r) => (
              <div key={r.label} className="py-2.5">
                <dt className="text-[12px] text-fg-faint">{r.label}</dt>
                <dd className={r.hidden ? "cipher mt-0.5 truncate text-[13px]" : "t-mono mt-0.5 truncate text-[13.5px] text-fg"}>{r.chain}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-fg-faint">Illustrative transfer.</p>
    </div>
  );
}
