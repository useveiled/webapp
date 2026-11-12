"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, SETTINGS_ITEM, type NavItem } from "@/components/app/nav";

/* ── Nav model ─────────────────────────────────────────────────────────── */

function pageTitle(pathname: string): string {
  const all = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];
  const match = all
    .filter((i) => (i.href === "/app" ? pathname === "/app" : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "App";
}

/* ── Nav link ──────────────────────────────────────────────────────────── */

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13.5px] no-underline transition-colors duration-150",
        active
          ? "bg-white/[0.07] font-medium text-fg shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]"
          : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
      )}
    >
      <span className={cn("flex shrink-0", active ? "text-signal" : "opacity-80")}>{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/* ── Sidebar content (shared by desktop rail and mobile drawer) ────────── */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  }

  return (
    <>
      <Link href="/" className="mb-3 flex h-[52px] shrink-0 items-center gap-2.5 px-4 text-fg no-underline">
        <Image src="/images/logo.png" alt="" width={26} height={26} />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Veiled</span>
      </Link>

      <nav aria-label="App" className="flex flex-1 flex-col gap-6 overflow-y-auto px-2.5 pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div className="mb-1.5 px-2.5 text-[12px] font-medium text-fg-faint">{group.label}</div>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-2.5 pb-2">
        <NavLink item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.href)} onNavigate={onNavigate} />
      </div>
    </>
  );
}

/* ── User card (bottom of sidebar) ─────────────────────────────────────── */

function UserCard() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, wallet_address, handle")
        .eq("id", data.user.id)
        .single();
      const name = profile?.display_name || data.user.email || "";
      setDisplayName(name);
      setWalletAddress(profile?.wallet_address || "");
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div ref={menuRef} className="relative shrink-0 px-2.5 pb-3">
      {menuOpen && (
        <div className="glass-strong border-gradient veil-in absolute bottom-[calc(100%+6px)] left-2.5 right-2.5 z-[100] rounded-[12px] p-1.5">
          {walletAddress && (
            <div className="mb-1.5 border-b border-line px-2.5 pb-2.5 pt-2">
              <div className="text-[12px] text-fg-faint">Wallet</div>
              <div className="t-mono mt-0.5 text-[12px] text-fg-body">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M6 2H2.5A1.5 1.5 0 0 0 1 3.5v8A1.5 1.5 0 0 0 2.5 13H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M10 10l3-2.5L10 5M13 7.5H5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      )}

      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-[11px] border border-line bg-white/[0.03] px-2.5 py-2 text-fg transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-fg text-[10.5px] font-semibold text-ink-0">
          {initials || "?"}
        </div>
        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">{displayName || "Account"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-fg-faint" aria-hidden="true">
          <path d="M2 6.5 5 3.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ── Top bar (page title + mobile menu) ────────────────────────────────── */

function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 px-3 pt-3">
    <header className="glass-strong border-gradient flex h-[52px] items-center gap-3 rounded-[14px] px-3 sm:px-5">
      <button
        className="btn btn-secondary btn-icon md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
          <line x1={3} y1={6} x2={17} y2={6} />
          <line x1={3} y1={10} x2={17} y2={10} />
          <line x1={3} y1={14} x2={17} y2={14} />
        </svg>
      </button>

      <div className="flex min-w-0 items-center gap-2 text-[13.5px]">
        <span className="hidden text-fg-faint sm:inline">Veiled</span>
        <span className="hidden text-fg-faint sm:inline" aria-hidden="true">/</span>
        <span className="truncate font-medium text-fg">{pageTitle(pathname)}</span>
      </div>
    </header>
    </div>
  );
}

/* ── Layout ────────────────────────────────────────────────────────────── */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  return (
    <div className="relative isolate flex min-h-screen">
      {/* Fixed backdrop for the whole dashboard: a dark veil whose folds sit
          behind the glass sidebar and top bar, leaving the content area calm.
          It never scrolls, so the glass always has something soft to blur. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-1]">
        <Image src="/images/bg-app-wave.jpg" alt="" fill priority quality={90} sizes="100vw" className="object-cover object-center opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_60%_55%,rgba(6,7,9,0.55),transparent_75%)]" />
      </div>

      {/* Desktop sidebar: a glass rail floating over the backdrop */}
      <div className="sticky top-0 hidden h-screen w-[248px] shrink-0 p-3 pr-0 md:block">
        <aside className="glass-strong border-gradient flex h-full flex-col rounded-[18px]">
          <SidebarContent />
          <UserCard />
        </aside>
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-[rgba(3,5,9,0.6)] backdrop-blur-[3px]" onClick={() => setMobileNavOpen(false)} />
          <aside className="glass-strong border-gradient veil-in absolute bottom-3 left-3 top-3 flex w-[260px] flex-col rounded-[18px]">
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            <UserCard />
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
