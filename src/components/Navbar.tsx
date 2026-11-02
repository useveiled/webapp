"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Privacy", href: "/#privacy" },
  { label: "For agents", href: "/#accounts" },
  { label: "FAQ", href: "/#faq" },
  { label: "Docs", href: "https://docs.useveiled.com" },
] as const;

function VeiledLogo() {
  return (
    <span className="flex items-center gap-2">
      <Image src="/images/logo.png" alt="" width={28} height={28} priority />
      <span className="text-[16px] font-semibold tracking-[-0.01em] text-fg">Veiled</span>
    </span>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1={3} y1={6} x2={17} y2={6} />
      <line x1={3} y1={10} x2={17} y2={10} />
      <line x1={3} y1={14} x2={17} y2={14} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1={4} y1={4} x2={16} y2={16} />
      <line x1={16} y1={4} x2={4} y2={16} />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true">
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 381.109 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.163 519.284Zm-144.999 168.404-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.164 687.688Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.44 7.44 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth={1.4} />
      <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const close = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3 sm:px-6">
        <div className="glass-strong border-gradient pointer-events-auto flex h-14 w-full max-w-[1200px] items-center rounded-[16px] pl-4 pr-2">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Veiled home">
            <VeiledLogo />
          </Link>

          <nav className="ml-8 hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-[8px] px-3 py-2 text-[14px] text-fg-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-fg"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <Link
              href="https://x.com/useveiled"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-icon"
              aria-label="Veiled on X"
            >
              <XIcon />
            </Link>
            <Link
              href="https://github.com/useveiled"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-icon"
              aria-label="Veiled on GitHub"
            >
              <GitHubIcon />
            </Link>
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-line-strong" />
            {user ? (
              <Link href="/app" className="btn btn-primary btn-sm">
                <UserIcon />
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Open an account
                </Link>
              </>
            )}
          </div>

          <button
            className="btn btn-ghost btn-icon ml-auto md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-[99] flex flex-col overflow-y-auto bg-[rgba(5,7,11,0.92)] px-3 pt-[84px] backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col px-3" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={close}
                className="border-b border-line py-4 text-[17px] text-fg-body transition-colors hover:text-fg"
              >
                {label}
              </Link>
            ))}
            <div className="flex gap-2 py-4">
              <Link href="https://x.com/useveiled" target="_blank" rel="noopener noreferrer" onClick={close} className="btn btn-secondary btn-icon" aria-label="Veiled on X">
                <XIcon />
              </Link>
              <Link href="https://github.com/useveiled" target="_blank" rel="noopener noreferrer" onClick={close} className="btn btn-secondary btn-icon" aria-label="Veiled on GitHub">
                <GitHubIcon />
              </Link>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <Link href="/app" onClick={close} className="btn btn-primary btn-lg">
                  <UserIcon />
                  Open app
                </Link>
              ) : (
                <>
                  <Link href="/signup" onClick={close} className="btn btn-primary btn-lg">
                    Open an account
                  </Link>
                  <Link href="/login" onClick={close} className="btn btn-secondary btn-lg">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
