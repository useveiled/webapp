"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database as RawDatabase, Account, SpendPolicy, AccountType, PrivacyTier, AccountStatus } from "@/lib/supabase/database.types";
import { ListAgentDrawer, ListAgentDrawerShell, RequiredMark } from "@/components/ListAgentDrawer";
import { Page, PageHeader, EmptyState, Notice, Dialog } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES: ("All" | "Human" | "Agent")[] = ["All", "Human", "Agent"];

// ---------------------------------------------------------------------------
// database.types.ts's `Relationships` arrays are empty (this project doesn't
// use the Supabase CLI to generate them), so a nested embed like
// `accounts.select("*, spend_policies(*)")` types the embedded field as a
// `SelectQueryError` even though PostgREST resolves the real foreign key at
// runtime just fine. This re-declares the one relationship this page needs,
// locally, without touching the shared types file.
// ---------------------------------------------------------------------------
type SpendPolicyRelationships = [
  {
    foreignKeyName: "spend_policies_account_id_fkey";
    columns: ["account_id"];
    isOneToOne: true;
    referencedRelation: "accounts";
    referencedColumns: ["id"];
  }
];
type TableRelOverrides = { spend_policies: SpendPolicyRelationships };
type WithRelationships<T> = {
  [K in keyof T]: Omit<T[K], "Relationships"> & {
    Relationships: K extends keyof TableRelOverrides ? TableRelOverrides[K] : [];
  };
};
type FixedDatabase = {
  public: {
    Tables: WithRelationships<RawDatabase["public"]["Tables"]>;
    Views: WithRelationships<RawDatabase["public"]["Views"]>;
    Functions: RawDatabase["public"]["Functions"];
  };
};

function db(): SupabaseClient<FixedDatabase> {
  return createClient() as unknown as SupabaseClient<FixedDatabase>;
}

type AccountRow = Account & { spend_policies: SpendPolicy | null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayHandle(account: AccountRow): string {
  return account.type === "human" ? `@${account.handle}.veiled` : `${account.handle}.veiled`;
}

function slugifyHandle(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "account";
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M1 7s2.5-4.5 6-4.5c1.1 0 2.1.28 2.98.74M13 7s-1 1.8-2.8 3.1M4.2 4.2C2.3 5.2 1 7 1 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

const TIER_BADGE: Record<PrivacyTier, string> = {
  public: "badge",
  confidential: "badge badge-signal",
  shielded: "badge badge-ok",
};

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: "badge badge-ok",
  paused: "badge badge-warn",
  revoked: "badge badge-danger",
};

function AccountCard({ account }: { account: AccountRow }) {
  const [revealed, setRevealed] = useState(false);
  const policy = account.spend_policies;
  const isRevoked = account.status === "revoked";

  return (
    <article className="surface flex h-full flex-col p-4">
      {/* Identity: name first, then the handle people pay */}
      <div className={cn("flex items-start justify-between gap-3", isRevoked && "opacity-60")}>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-fg">{account.name}</h3>
            {account.is_primary && <span className="badge shrink-0">Primary</span>}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-fg-muted">
            <span className="t-mono truncate">{displayHandle(account)}</span>
            <span aria-hidden="true" className="text-fg-faint">·</span>
            <span className="shrink-0">{capitalize(account.type)}</span>
          </div>
        </div>
        {/* Status only when it needs attention; active is the normal case */}
        {account.status !== "active" && (
          <span className={cn(STATUS_BADGE[account.status], "shrink-0")}>
            <span className="dot" />
            {capitalize(account.status)}
          </span>
        )}
      </div>

      {/* Balance: the one number that matters, hidden until asked for */}
      <div className={cn("mt-5", isRevoked && "opacity-60")}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12.5px] text-fg-muted">Balance</span>
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={revealed ? `Hide ${account.name} balance` : `Show ${account.name} balance`}
            className="-mr-1 inline-flex items-center gap-1.5 rounded-[6px] px-1 text-[12.5px] text-fg-muted transition-colors hover:text-fg"
          >
            <EyeIcon open={!revealed} />
            {revealed ? "Hide" : "Show"}
          </button>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          {revealed ? (
            <span className="t-num veil-in inline-block text-[24px] font-semibold leading-tight tracking-[-0.01em] text-fg">
              {formatUsd(account.balance)}
            </span>
          ) : (
            // A fixed placeholder behind a veil: same for every account, so it leaks nothing
            <span role="img" aria-label="Balance hidden" className="inline-block">
              <span aria-hidden="true" className="t-num inline-block select-none text-[24px] font-semibold leading-tight tracking-[-0.01em] text-fg-body blur-[5px]">
                $0,000.00
              </span>
            </span>
          )}
          <span className="text-[12.5px] text-fg-faint">USDG</span>
        </div>
      </div>

      {/* Agent spend policy, or description for human accounts */}
      {account.type === "agent" ? (
        <div className={cn("mt-5 border-t border-line pt-4", isRevoked && "opacity-60")}>
          <dl className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <dt className="text-[12px] text-fg-muted">Per request</dt>
              <dd className="t-num mt-0.5 truncate text-[13.5px] text-fg">{policy ? formatUsd(policy.max_per_request) : "n/a"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[12px] text-fg-muted">Daily limit</dt>
              <dd className="t-num mt-0.5 truncate text-[13.5px] text-fg">{policy ? formatUsd(policy.max_per_day) : "n/a"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[12px] text-fg-muted">Domains</dt>
              <dd className="t-num mt-0.5 truncate text-[13.5px] text-fg">
                {policy && policy.allowed_domains.length > 0 ? policy.allowed_domains.length : "any"}
              </dd>
            </div>
          </dl>
        </div>
      ) : account.description ? (
        <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">{account.description}</p>
      ) : null}

      {/* Footer, pinned to the bottom so cards in a row line up */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <span className={TIER_BADGE[account.privacy_tier]}>{capitalize(account.privacy_tier)}</span>
        {!isRevoked && (
          <Link href={`/app/run?to=${account.handle}`} className="btn btn-secondary btn-sm">
            Send payment
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </article>
  );
}

function AccountCardSkeleton() {
  return (
    <div className="surface flex flex-col p-4" aria-hidden="true">
      <div className="space-y-2">
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-3 w-3/5" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="skeleton h-3 w-1/5" />
        <div className="skeleton h-7 w-2/5" />
      </div>
      <div className="mt-5 flex items-center justify-between pt-5">
        <div className="skeleton h-[22px] w-24" />
        <div className="skeleton h-8 w-28" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create human sub-account modal
// ---------------------------------------------------------------------------

function CreateHumanAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [privacyTier, setPrivacyTier] = useState<PrivacyTier>("confidential");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("error");
      setErrorMsg("Not authenticated");
      return;
    }

    const base = slugifyHandle(name);
    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < 5) {
      const handle = attempt === 0 ? base : `${base.slice(0, 36)}-${attempt}`;
      const { error } = await supabase.from("accounts").insert({
        owner_id: user.id,
        type: "human",
        name: name.trim(),
        handle,
        privacy_tier: privacyTier,
      });

      if (!error) {
        onCreated();
        onClose();
        return;
      }

      if (error.code === "23505") {
        lastError = error.message;
        attempt += 1;
        continue;
      }

      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("error");
    setErrorMsg(lastError ?? "Could not generate a unique handle, try a different name.");
  }

  const submitting = status === "submitting";

  return (
    <Dialog
      open
      onClose={onClose}
      title="Create human account"
      description="A secondary account under your name, for example a savings or treasury account. Starts at a zero balance."
      width={440}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" form="create-human-account" disabled={submitting} aria-busy={submitting} className="btn btn-primary">
            {submitting ? "Creating…" : "Create account"}
          </button>
        </>
      }
    >
      <form id="create-human-account" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {status === "error" && <Notice tone="danger">{errorMsg}</Notice>}
        <div>
          <label className="field-label" htmlFor="human-account-name">Account name<RequiredMark /></label>
          <input id="human-account-name" className="input" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Treasury" disabled={submitting} />
        </div>
        <div>
          <label className="field-label" htmlFor="human-account-tier">Privacy tier</label>
          <select id="human-account-tier" className="input cursor-pointer" value={privacyTier} onChange={(e) => setPrivacyTier(e.target.value as PrivacyTier)}
            disabled={submitting}>
            <option value="confidential">Confidential</option>
            <option value="shielded">Shielded</option>
          </select>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const [activeType, setActiveType] = useState<"All" | "Human" | "Agent">("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [agentDrawerOpen, setAgentDrawerOpen] = useState(false);
  const [humanModalOpen, setHumanModalOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = db();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("*, spend_policies(*)")
      .eq("owner_id", user.id)
      .order("created_at");

    if (error) {
      setLoadError(error.message);
      setAccounts([]);
      setLoading(false);
      return;
    }

    setAccounts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const typeFilterValue: AccountType | null = activeType === "Human" ? "human" : activeType === "Agent" ? "agent" : null;

  const filtered = accounts
    .filter((a) => typeFilterValue === null || a.type === typeFilterValue)
    .filter((a) =>
      search === "" ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.handle.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "balance-desc") return b.balance - a.balance;
      if (sortBy === "balance-asc") return a.balance - b.balance;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      // "recent": preserve the created_at ascending order from the query, newest last -> reverse for newest first
      return 0;
    });

  if (sortBy === "recent") filtered.reverse();

  const createMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setCreateMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={createMenuOpen}
        className="btn btn-primary"
      >
        <span aria-hidden="true" className="-ml-0.5 text-[16px] leading-none">+</span>
        Create account
      </button>
      {createMenuOpen && (
        <>
          <div onClick={() => setCreateMenuOpen(false)} className="fixed inset-0 z-[90]" />
          <div
            role="menu"
            className="glass-strong border-gradient veil-in absolute right-0 top-[calc(100%+6px)] z-[91] w-[220px] rounded-[12px] p-1.5"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => { setCreateMenuOpen(false); setAgentDrawerOpen(true); }}
              className="block w-full rounded-[8px] px-3 py-2 text-left text-[13.5px] text-fg transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06]"
            >
              Agent account
              <span className="mt-0.5 block text-[12px] text-fg-muted">Spends under an on-chain policy</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setCreateMenuOpen(false); setHumanModalOpen(true); }}
              className="block w-full rounded-[8px] px-3 py-2 text-left text-[13.5px] text-fg transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06]"
            >
              Human account
              <span className="mt-0.5 block text-[12px] text-fg-muted">Savings or treasury under your name</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Page>
      <PageHeader
        title="Accounts"
        description={loading ? "Loading accounts…" : `${accounts.length} account${accounts.length !== 1 ? "s" : ""}. Balances stay hidden until you choose to show them.`}
        actions={createMenu}
      />

      {loadError && <Notice tone="danger" className="mb-5">{loadError}</Notice>}

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="segmented self-start" role="group" aria-label="Account type">
          {ACCOUNT_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => setActiveType(type)} aria-pressed={activeType === type}>
              {type}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-2 md:justify-end">
          <div className="relative min-w-0 flex-1 md:max-w-[340px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              aria-label="Search accounts"
              placeholder="Search accounts, handles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input !pl-9"
            />
          </div>
          <select
            aria-label="Sort accounts"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input !w-auto shrink-0 cursor-pointer"
          >
            <option value="recent">Most recent</option>
            <option value="balance-desc">Balance: high to low</option>
            <option value="balance-asc">Balance: low to high</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Account grid */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3" aria-busy="true" aria-label="Loading accounts">
          {[...Array(3)].map((_, i) => (
            <AccountCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
          {filtered.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : loadError ? null : accounts.length === 0 ? (
        <div className="surface">
          <EmptyState
            title="No accounts yet"
            description="Create an agent account to give software its own private balance and a spending policy."
            action={
              <button type="button" onClick={() => setAgentDrawerOpen(true)} className="btn btn-secondary">
                Create agent account
              </button>
            }
          />
        </div>
      ) : (
        <div className="surface">
          <EmptyState
            title="No accounts found"
            description={search ? `Nothing matches "${search}".` : "No accounts of this type."}
            action={
              <button type="button" onClick={() => { setSearch(""); setActiveType("All"); }} className="btn btn-ghost">
                Clear filters
              </button>
            }
          />
        </div>
      )}

      {agentDrawerOpen && (
        <ListAgentDrawerShell onClose={() => setAgentDrawerOpen(false)}>
          <ListAgentDrawer onClose={() => { setAgentDrawerOpen(false); fetchAccounts(); }} />
        </ListAgentDrawerShell>
      )}

      {humanModalOpen && (
        <CreateHumanAccountModal onClose={() => setHumanModalOpen(false)} onCreated={fetchAccounts} />
      )}
    </Page>
  );
}
