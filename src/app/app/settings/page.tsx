"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileSettings } from "@/lib/supabase/database.types";
import { Notice, Page, PageHeader, Panel, PanelHeader } from "@/components/app/ui";

type ToggleKey = "requireConfirm" | "autoTopup" | "streamResults" | "saveHistory" | "dataSharing";

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "border-signal/40 bg-signal" : "border-line-strong bg-white/10 hover:bg-white/15"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[2px] h-3.5 w-3.5 rounded-full transition-[left] duration-150 ${
          on ? "left-[18px] bg-ink-0" : "left-[2px] bg-fg"
        }`}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel padded={false}>
      <PanelHeader title={title} className="mb-0 border-b border-line px-5 py-4" />
      <div className="divided">{children}</div>
    </Panel>
  );
}

function Row({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[14px] text-fg">{label}</div>
        {sublabel && <div className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{sublabel}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* Inline save feedback next to a section's action button. */
function StatusText({ tone, children }: { tone: "ok" | "danger"; children: React.ReactNode }) {
  return (
    <span role={tone === "danger" ? "alert" : "status"} className={`text-[13px] ${tone === "ok" ? "text-ok" : "text-danger"}`}>
      {children}
    </span>
  );
}

const DEFAULT_PREFS: Record<ToggleKey, boolean> = {
  requireConfirm: true,
  autoTopup: false,
  streamResults: true,
  saveHistory: true,
  dataSharing: false,
};

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [walletStatus, setWalletStatus] = useState<"idle" | "saving" | "saved" | "error" | "invalid">("idle");

  const [daily, setDaily] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [limitsStatus, setLimitsStatus] = useState<"idle" | "saving" | "saved" | "error" | "invalid">("idle");

  const [prefs, setPrefs] = useState<Record<ToggleKey, boolean>>(DEFAULT_PREFS);
  const [togglingKey, setTogglingKey] = useState<ToggleKey | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "confirming" | "deleting" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setProfileLoading(true);
      setProfileError(null);
      const supabase = createClient();

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (!cancelled) {
          setProfileError("You need to sign in to view settings.");
          setProfileLoading(false);
        }
        return;
      }
      if (!cancelled) setEmail(userData.user.email ?? "");

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (cancelled) return;

      if (profileErr || !profileData) {
        setProfileError("Could not load your profile. Try refreshing the page.");
        setProfileLoading(false);
        return;
      }

      setProfile(profileData);
      setDisplayName(profileData.display_name ?? "");
      setWalletAddress(profileData.wallet_address ?? "");
      setDaily(String(profileData.settings?.dailyLimit ?? 0));
      setMonthly(String(profileData.settings?.monthlyLimit ?? 0));
      setPrefs({
        requireConfirm: profileData.settings?.requireConfirm ?? true,
        autoTopup: profileData.settings?.autoTopup ?? false,
        streamResults: profileData.settings?.streamResults ?? true,
        saveHistory: profileData.settings?.saveHistory ?? true,
        dataSharing: profileData.settings?.dataSharing ?? false,
      });
      setProfileLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaveStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", profile.id);
    if (error) {
      setSaveStatus("error");
      return;
    }
    setProfile((p) => (p ? { ...p, display_name: displayName } : p));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  function isValidWalletAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  async function handleSaveWallet() {
    if (!profile) return;
    if (walletAddress && !isValidWalletAddress(walletAddress)) {
      setWalletStatus("invalid");
      return;
    }
    setWalletStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ wallet_address: walletAddress || null }).eq("id", profile.id);
    if (error) {
      setWalletStatus("error");
      return;
    }
    setProfile((p) => (p ? { ...p, wallet_address: walletAddress || null } : p));
    setWalletStatus("saved");
    setTimeout(() => setWalletStatus("idle"), 1500);
  }

  async function handleSaveLimits() {
    if (!profile) return;
    const dailyNum = Number(daily);
    const monthlyNum = Number(monthly);
    if (!Number.isFinite(dailyNum) || dailyNum < 0 || !Number.isFinite(monthlyNum) || monthlyNum < 0) {
      setLimitsStatus("invalid");
      return;
    }
    setLimitsStatus("saving");
    const supabase = createClient();
    const newSettings: ProfileSettings = { ...profile.settings, dailyLimit: dailyNum, monthlyLimit: monthlyNum };
    const { error } = await supabase.from("profiles").update({ settings: newSettings }).eq("id", profile.id);
    if (error) {
      setLimitsStatus("error");
      return;
    }
    setProfile((p) => (p ? { ...p, settings: newSettings } : p));
    setLimitsStatus("saved");
    setTimeout(() => setLimitsStatus("idle"), 1500);
  }

  async function handleToggle(key: ToggleKey) {
    if (!profile || togglingKey) return;
    const newValue = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: newValue }));
    setTogglingKey(key);
    setToggleError(null);
    const supabase = createClient();
    const newSettings: ProfileSettings = { ...profile.settings, [key]: newValue };
    const { error } = await supabase.from("profiles").update({ settings: newSettings }).eq("id", profile.id);
    setTogglingKey(null);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: !newValue }));
      setToggleError("Could not save that change. Try again.");
      setTimeout(() => setToggleError(null), 2500);
      return;
    }
    setProfile((p) => (p ? { ...p, settings: newSettings } : p));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleExport() {
    if (!profile) return;
    setExportStatus("exporting");
    try {
      const supabase = createClient();
      const [accountsRes, transactionsRes, alertsRes, apiKeysRes, webhooksRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("owner_id", profile.id),
        supabase.from("transactions").select("*"),
        supabase.from("alerts").select("*").eq("profile_id", profile.id),
        supabase.from("api_keys").select("*").eq("profile_id", profile.id),
        supabase.from("webhooks").select("*").eq("profile_id", profile.id),
      ]);

      const exportPayload = {
        exported_at: new Date().toISOString(),
        profile,
        accounts: accountsRes.data ?? [],
        transactions: transactionsRes.data ?? [],
        alerts: alertsRes.data ?? [],
        api_keys: apiKeysRes.data ?? [],
        webhooks: webhooksRes.data ?? [],
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `veiled-export-${profile.handle}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("idle");
    } catch {
      setExportStatus("error");
    }
  }

  async function handleDeleteAccount() {
    if (!profile) return;
    if (deleteStatus !== "confirming") {
      setDeleteStatus("confirming");
      return;
    }
    setDeleteStatus("deleting");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (error) {
      setDeleteStatus("error");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (profileLoading) {
    return (
      <Page className="max-w-[760px]">
        <PageHeader title="Settings" description="Manage your account, wallet, and preferences." />
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading settings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton mt-4 h-10 w-full" />
              <div className="skeleton mt-3 h-10 w-full" />
            </div>
          ))}
        </div>
      </Page>
    );
  }

  if (profileError || !profile) {
    return (
      <Page className="max-w-[760px]">
        <PageHeader title="Settings" />
        <Notice tone="danger">{profileError ?? "Could not load your profile."}</Notice>
      </Page>
    );
  }

  return (
    <Page className="max-w-[760px]">
      <PageHeader title="Settings" description="Manage your account, wallet, and preferences." />

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <Section title="Profile">
          <Row label="Handle" sublabel="Your permanent Veiled identity, cannot be changed">
            <div className="well t-mono flex h-10 w-full items-center truncate px-3 text-[13px] text-fg-body sm:w-[220px]">
              @{profile.handle}.veiled
            </div>
          </Row>
          <Row label="Display name" sublabel="Shown on your public creator profile">
            <input
              aria-label="Display name"
              className="input sm:w-[220px]"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Row>
          <Row label="Email" sublabel="For execution receipts and alerts">
            <input aria-label="Email" className="input sm:w-[220px]" value={email} disabled />
          </Row>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="btn btn-secondary btn-sm"
            >
              {saveStatus === "saving" ? "Saving..." : "Save changes"}
            </button>
            <button type="button" onClick={handleSignOut} className="btn btn-ghost btn-sm">
              Sign out
            </button>
            {saveStatus === "saved" && <StatusText tone="ok">Saved</StatusText>}
            {saveStatus === "error" && <StatusText tone="danger">Something went wrong</StatusText>}
          </div>
        </Section>

        {/* Wallet */}
        <Section title="Connected wallet">
          <Row label="Wallet address" sublabel="Your Solana wallet address for payouts and on-chain activity">
            <input
              aria-label="Wallet address"
              aria-invalid={walletStatus === "invalid"}
              className="input t-mono text-[13px] sm:w-[260px]"
              value={walletAddress}
              onChange={(e) => { setWalletAddress(e.target.value); setWalletStatus("idle"); }}
              placeholder="e.g. 9xQeWv...pNdT"
            />
          </Row>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <button
              type="button"
              onClick={handleSaveWallet}
              disabled={walletStatus === "saving"}
              className="btn btn-secondary btn-sm"
            >
              {walletStatus === "saving" ? "Saving..." : "Save wallet"}
            </button>
            {walletStatus === "saved" && <StatusText tone="ok">Saved</StatusText>}
            {walletStatus === "invalid" && <StatusText tone="danger">Invalid wallet address</StatusText>}
            {walletStatus === "error" && <StatusText tone="danger">Something went wrong</StatusText>}
          </div>
        </Section>

        {/* Spending limits */}
        <Section title="Spending limits">
          <Row label="Daily limit" sublabel="Block sends once your daily total reaches this. Set to 0 for no limit">
            <div className="relative sm:w-[140px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-fg-faint">$</span>
              <input
                aria-label="Daily limit in dollars"
                aria-invalid={limitsStatus === "invalid"}
                className="input t-num pl-7"
                value={daily}
                onChange={(e) => { setDaily(e.target.value); setLimitsStatus("idle"); }}
                type="number"
                min={0}
              />
            </div>
          </Row>
          <Row label="Monthly limit" sublabel="Hard cap for the calendar month. Set to 0 for no limit">
            <div className="relative sm:w-[140px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-fg-faint">$</span>
              <input
                aria-label="Monthly limit in dollars"
                aria-invalid={limitsStatus === "invalid"}
                className="input t-num pl-7"
                value={monthly}
                onChange={(e) => { setMonthly(e.target.value); setLimitsStatus("idle"); }}
                type="number"
                min={0}
              />
            </div>
          </Row>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <button
              type="button"
              onClick={handleSaveLimits}
              disabled={limitsStatus === "saving"}
              className="btn btn-secondary btn-sm"
            >
              {limitsStatus === "saving" ? "Saving..." : "Save limits"}
            </button>
            {limitsStatus === "saved" && <StatusText tone="ok">Saved</StatusText>}
            {limitsStatus === "invalid" && <StatusText tone="danger">Enter a valid non-negative amount</StatusText>}
            {limitsStatus === "error" && <StatusText tone="danger">Something went wrong</StatusText>}
          </div>
          <Row label="Require confirmation" sublabel="Show a confirmation modal before any payment over $0.50">
            <Toggle on={prefs.requireConfirm} onToggle={() => handleToggle("requireConfirm")} disabled={togglingKey === "requireConfirm"} />
          </Row>
          <Row label="Auto top-up" sublabel="Automatically top up your primary account when its balance runs low">
            <Toggle on={prefs.autoTopup} onToggle={() => handleToggle("autoTopup")} disabled={togglingKey === "autoTopup"} />
          </Row>
        </Section>

        {/* Execution preferences */}
        <Section title="Execution preferences">
          <Row label="Stream results" sublabel="Show output as it arrives instead of waiting for completion">
            <Toggle on={prefs.streamResults} onToggle={() => handleToggle("streamResults")} disabled={togglingKey === "streamResults"} />
          </Row>
          <Row label="Save execution history" sublabel="Store all run outputs and receipts in your account">
            <Toggle on={prefs.saveHistory} onToggle={() => handleToggle("saveHistory")} disabled={togglingKey === "saveHistory"} />
          </Row>
          <Row label="Share anonymised usage data" sublabel="Help improve agent quality. No input content is shared.">
            <Toggle on={prefs.dataSharing} onToggle={() => handleToggle("dataSharing")} disabled={togglingKey === "dataSharing"} />
          </Row>
          {toggleError && (
            <div className="px-5 py-3">
              <Notice tone="danger">{toggleError}</Notice>
            </div>
          )}
        </Section>

        {/* Data export */}
        <Section title="Your data">
          <Row label="Export all data" sublabel="Download a full JSON export of your accounts, transactions, alerts, API keys, and webhooks">
            <button
              type="button"
              onClick={handleExport}
              disabled={exportStatus === "exporting"}
              className="btn btn-secondary btn-sm"
            >
              {exportStatus === "exporting" ? "Exporting..." : "Export"}
            </button>
          </Row>
          {exportStatus === "error" && (
            <div className="px-5 py-3">
              <Notice tone="danger">Something went wrong preparing your export. Try again.</Notice>
            </div>
          )}
        </Section>

        {/* Danger zone */}
        <Panel className="border-danger/25">
          <PanelHeader title="Danger zone" />
          {profile.deletion_requested_at ? (
            <Notice tone="danger">
              Account deletion requested on {new Date(profile.deletion_requested_at).toLocaleDateString()}. Contact support to cancel.
            </Notice>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <div className="text-[14px] text-fg">Delete account</div>
                <p className="mt-0.5 max-w-[480px] text-[13px] leading-relaxed text-fg-muted">
                  Requesting deletion signs you out immediately and schedules your account and all its data for
                  permanent removal within 30 days. Contact support before then if you change your mind.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {deleteStatus === "confirming" && (
                  <button type="button" onClick={() => setDeleteStatus("idle")} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteStatus === "deleting"}
                  className="btn btn-danger btn-sm"
                >
                  {deleteStatus === "deleting"
                    ? "Deleting..."
                    : deleteStatus === "confirming"
                    ? "Click again to confirm"
                    : "Delete account"}
                </button>
              </div>
            </div>
          )}
          {deleteStatus === "error" && (
            <Notice tone="danger" className="mt-3">
              Something went wrong
            </Notice>
          )}
        </Panel>
      </div>
    </Page>
  );
}
