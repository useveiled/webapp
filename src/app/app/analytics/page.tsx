"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Account, PrivacyLayer, Transaction } from "@/lib/supabase/database.types";
import { Page, PageHeader, Panel, PanelHeader, Stat, EmptyState } from "@/components/app/ui";
import { cn } from "@/lib/utils";

type RangeOption = "7d" | "30d" | "90d";

const RANGE_DAYS: Record<RangeOption, number> = { "7d": 7, "30d": 30, "90d": 90 };

const LAYER_ORDER: PrivacyLayer[] = ["Confidential", "Shielded", "Public"];
const LAYER_COLOR: Record<PrivacyLayer, string> = {
  Confidential: "var(--signal)",
  Shielded: "var(--fg-muted)",
  Public: "var(--fg-faint)",
};
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// JS Date#getDay(): 0 = Sun ... 6 = Sat. Remap so Monday is index 0.
function mondayFirstDow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function DeltaLabel({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span>
      <span className={cn("t-num", positive ? "text-ok" : "text-danger")}>
        {positive ? "+" : ""}
        {value.toFixed(1)}
        {suffix}
      </span>{" "}
      vs last period
    </span>
  );
}

// Heatmap fill: empty cells stay neutral, activity ramps up in the signal color.
function heatColor(alpha: number): string {
  return alpha <= 0.05 ? "rgba(255,255,255,0.05)" : `rgba(184,172,242,${alpha})`;
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-[13px] text-fg-muted">{children}</p>;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeOption>("7d");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setAuthed(false); setAccounts([]); setTransactions([]); setPrevTransactions([]); setLoading(false); }
        return;
      }

      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("owner_id", user.id);
      const userAccounts = (accountsData as Account[]) ?? [];

      if (userAccounts.length === 0) {
        if (!cancelled) { setAuthed(true); setAccounts([]); setTransactions([]); setPrevTransactions([]); setLoading(false); }
        return;
      }

      const days = RANGE_DAYS[range];
      const now = Date.now();
      const cutoffIso = new Date(now - days * 86400000).toISOString();
      const prevCutoffIso = new Date(now - 2 * days * 86400000).toISOString();
      const idList = userAccounts.map((a) => a.id).join(",");
      const orFilter = `from_account_id.in.(${idList}),to_account_id.in.(${idList})`;

      const [{ data: currentData }, { data: prevData }] = await Promise.all([
        supabase.from("transactions").select("*").or(orFilter).gte("created_at", cutoffIso).order("created_at", { ascending: true }),
        supabase.from("transactions").select("*").or(orFilter).gte("created_at", prevCutoffIso).lt("created_at", cutoffIso),
      ]);

      if (cancelled) return;
      setAuthed(true);
      setAccounts(userAccounts);
      setTransactions((currentData as Transaction[]) ?? []);
      setPrevTransactions((prevData as Transaction[]) ?? []);
      setLoading(false);
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [range]);

  // ---- KPIs ----
  const totalTransfers = transactions.length;
  const totalVolume = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const avgAmount = totalTransfers > 0 ? totalVolume / totalTransfers : 0;
  const settledCount = transactions.filter((t) => t.status === "settled").length;
  const settledRate = totalTransfers > 0 ? (settledCount / totalTransfers) * 100 : null;

  const prevTotalTransfers = prevTransactions.length;
  const prevTotalVolume = prevTransactions.reduce((s, t) => s + Number(t.amount), 0);
  const prevAvgAmount = prevTotalTransfers > 0 ? prevTotalVolume / prevTotalTransfers : 0;
  const prevSettledCount = prevTransactions.filter((t) => t.status === "settled").length;
  const prevSettledRate = prevTotalTransfers > 0 ? (prevSettledCount / prevTotalTransfers) * 100 : null;

  const transfersDelta = pctDelta(totalTransfers, prevTotalTransfers);
  const volumeDelta = pctDelta(totalVolume, prevTotalVolume);
  const avgDelta = pctDelta(avgAmount, prevAvgAmount);
  const settledDelta = settledRate !== null && prevSettledRate !== null ? settledRate - prevSettledRate : null;

  const kpis: { label: string; value: string; delta: number | null; suffix?: string }[] = [
    { label: "Total transfers", value: totalTransfers.toLocaleString(), delta: transfersDelta },
    { label: "Total volume", value: `$${totalVolume.toFixed(2)}`, delta: volumeDelta },
    { label: "Avg transfer amount", value: totalTransfers > 0 ? `$${avgAmount.toFixed(2)}` : "n/a", delta: avgDelta },
    { label: "Settled rate", value: settledRate !== null ? `${settledRate.toFixed(1)}%` : "n/a", delta: settledDelta, suffix: "pts" },
  ];

  // ---- Transfers per day ----
  const days = RANGE_DAYS[range];
  const dayBuckets: { key: string; label: string; count: number; volume: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = range === "7d"
      ? d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    dayBuckets.push({ key, label, count: 0, volume: 0 });
  }
  const dayBucketMap = new Map(dayBuckets.map((b) => [b.key, b]));
  transactions.forEach((t) => {
    const key = t.created_at.slice(0, 10);
    const bucket = dayBucketMap.get(key);
    if (bucket) { bucket.count += 1; bucket.volume += Number(t.amount); }
  });
  const maxDayCount = Math.max(1, ...dayBuckets.map((d) => d.count));
  // For 90d, thin the x-axis labels so they don't collide.
  const labelEvery = range === "90d" ? 10 : range === "30d" ? 5 : 1;

  // ---- Volume by account ----
  const accountTotals = new Map<string, { name: string; handle: string; type: Account["type"]; count: number; volume: number }>();
  accounts.forEach((a) => accountTotals.set(a.id, { name: a.name, handle: a.handle, type: a.type, count: 0, volume: 0 }));
  transactions.forEach((t) => {
    if (t.from_account_id && accountTotals.has(t.from_account_id)) {
      const e = accountTotals.get(t.from_account_id)!;
      e.count += 1;
      e.volume += Number(t.amount);
    }
    if (t.to_account_id && accountTotals.has(t.to_account_id)) {
      const e = accountTotals.get(t.to_account_id)!;
      e.count += 1;
      e.volume += Number(t.amount);
    }
  });
  const accountRows = Array.from(accountTotals.values())
    .filter((e) => e.count > 0)
    .sort((a, b) => b.volume - a.volume);
  const maxAccountVolume = Math.max(1, ...accountRows.map((a) => a.volume));

  // ---- Volume by privacy layer ----
  const layerTotals = new Map<PrivacyLayer, number>();
  transactions.forEach((t) => layerTotals.set(t.privacy_layer, (layerTotals.get(t.privacy_layer) ?? 0) + Number(t.amount)));
  const layerRows = LAYER_ORDER.map((layer) => ({
    category: layer,
    spend: layerTotals.get(layer) ?? 0,
    color: LAYER_COLOR[layer],
  }));

  // ---- Activity heatmap: [day-of-week Mon..Sun][hour 0..23] ----
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCell = 0;
  transactions.forEach((t) => {
    const d = new Date(t.created_at);
    const dow = mondayFirstDow(d);
    const hour = d.getHours();
    heatmap[dow][hour] += 1;
    if (heatmap[dow][hour] > maxCell) maxCell = heatmap[dow][hour];
  });
  function cellAlpha(count: number): number {
    if (maxCell === 0 || count === 0) return 0.05;
    const ratio = count / maxCell;
    return ratio < 0.3 ? 0.2 : ratio < 0.6 ? 0.45 : ratio < 0.85 ? 0.7 : 0.95;
  }

  const hasData = totalTransfers > 0;

  return (
    <Page>
      <PageHeader
        title="Analytics"
        description="Your transfer volume and privacy layer breakdown."
        actions={
          <div className="segmented" role="group" aria-label="Time range">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRange(r)} disabled={loading} aria-pressed={range === r} className="t-num disabled:cursor-default">
                {r}
              </button>
            ))}
          </div>
        }
      />

      {!authed ? (
        <Panel padded={false}>
          <EmptyState
            title="Sign in to see your analytics"
            description="Transfer volume, privacy layer breakdown and activity patterns appear here once you sign in."
            action={<Link href="/login" className="btn btn-secondary btn-sm">Sign in</Link>}
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {/* KPI row */}
          <Panel padded={false} className="grid grid-cols-2 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <Stat
                key={k.label}
                label={k.label}
                value={loading ? <span className="skeleton inline-block h-6 w-20 align-middle" /> : k.value}
                hint={!loading && k.delta !== null ? <DeltaLabel value={k.delta} suffix={k.suffix} /> : undefined}
                className={cn(
                  "border-line px-5 py-4",
                  i % 2 === 1 && "border-l",
                  i >= 2 && "border-t lg:border-t-0",
                  i === 2 && "lg:border-l",
                )}
              />
            ))}
          </Panel>

          {/* Transfers per day */}
          <Panel>
            <PanelHeader title="Transfers per day" />
            {loading ? (
              <div className="skeleton h-[160px] w-full" />
            ) : !hasData ? (
              <ChartEmpty>Not enough activity in this range yet.</ChartEmpty>
            ) : (
              <div className="flex gap-2">
                {/* Y axis */}
                <div className="t-num flex h-[160px] shrink-0 flex-col justify-between pb-[22px] text-right text-[11px] leading-none text-fg-faint" aria-hidden="true">
                  <span className="-translate-y-1/2">{maxDayCount}</span>
                  <span className="translate-y-1/2">0</span>
                </div>
                <div className="relative h-[160px] min-w-0 flex-1">
                  {/* Gridlines */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-[22px] top-0 flex flex-col justify-between" aria-hidden="true">
                    <div className="border-t border-white/[0.06]" />
                    <div className="border-t border-white/[0.06]" />
                    <div className="border-t border-white/[0.06]" />
                  </div>
                  <div className={cn("relative flex h-full items-end", range === "90d" ? "gap-[2px]" : range === "30d" ? "gap-1" : "gap-2.5")}>
                    {dayBuckets.map((d, i) => (
                      <div
                        key={d.key}
                        title={`${d.label}: ${d.count} transfer${d.count !== 1 ? "s" : ""}, $${d.volume.toFixed(2)}`}
                        className="group flex h-full min-w-0 flex-1 flex-col items-center"
                      >
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={cn(
                              "min-h-[2px] w-full rounded-t-[2px] transition-opacity",
                              d.count > 0 ? "bg-signal group-hover:opacity-80" : "bg-white/[0.06]",
                            )}
                            style={{ height: `${(d.count / maxDayCount) * 100}%` }}
                          />
                        </div>
                        <div className="flex h-[22px] items-end whitespace-nowrap text-[11px] leading-none text-fg-faint">
                          {i % labelEvery === 0 ? d.label : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Volume by account */}
            <Panel className="min-w-0">
              <PanelHeader title="Transfer volume by account" />
              {loading ? (
                <div className="flex flex-col gap-4">
                  {[0, 1, 2].map((n) => (
                    <div key={n}>
                      <div className="skeleton h-4 w-2/3" />
                      <div className="skeleton mt-2 h-1 w-full" />
                    </div>
                  ))}
                </div>
              ) : accountRows.length === 0 ? (
                <ChartEmpty>Not enough activity in this range yet.</ChartEmpty>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {accountRows.map((a) => (
                    <li key={a.handle}>
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="min-w-0 truncate text-[13.5px] text-fg">
                          {a.name} <span className="t-mono text-[12.5px] text-fg-faint">@{a.handle}</span>
                        </span>
                        <span className="t-num text-[12.5px] text-fg-muted">
                          {a.count} transfer{a.count !== 1 ? "s" : ""} · <span className="t-mono text-fg-body">${a.volume.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-signal" style={{ width: `${(a.volume / maxAccountVolume) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Volume by privacy layer */}
            <Panel className="min-w-0">
              <PanelHeader title="Volume by privacy layer" />
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map((n) => <div key={n} className="skeleton h-4 w-full" />)}
                </div>
              ) : !hasData ? (
                <ChartEmpty>Not enough activity in this range yet.</ChartEmpty>
              ) : (
                <>
                  <ul className="flex flex-col gap-2.5">
                    {layerRows.map((c) => (
                      <li key={c.category} className="flex items-center gap-2.5">
                        <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: c.color }} aria-hidden="true" />
                        <span className="flex-1 text-[13.5px] text-fg-body">{c.category}</span>
                        <span className="t-mono t-num text-[13px] text-fg">${c.spend.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between border-t border-line pt-3">
                    <span className="text-[13px] text-fg-muted">Total</span>
                    <span className="t-mono t-num text-[13px] font-medium text-fg">${totalVolume.toFixed(2)}</span>
                  </div>
                </>
              )}
            </Panel>
          </div>

          {/* Activity heatmap */}
          <Panel>
            <PanelHeader title="Activity heatmap" description="Transfers by weekday and hour, in your local time." />
            {loading ? (
              <div className="skeleton h-[150px] w-full max-w-[640px]" />
            ) : !hasData ? (
              <ChartEmpty>Not enough activity in this range yet to show a pattern.</ChartEmpty>
            ) : (
              <div className="max-w-[640px]">
                <div className="grid grid-cols-[28px_repeat(24,minmax(0,1fr))] gap-[3px]">
                  {heatmap.map((row, dowIdx) => (
                    <div key={DOW_LABELS[dowIdx]} className="contents">
                      <span className="self-center text-[11px] leading-none text-fg-faint">{DOW_LABELS[dowIdx]}</span>
                      {row.map((count, hourIdx) => (
                        <div
                          key={hourIdx}
                          title={`${DOW_LABELS[dowIdx]} ${hourIdx}:00, ${count} transfer${count !== 1 ? "s" : ""}`}
                          className="aspect-square rounded-[2px]"
                          style={{ backgroundColor: heatColor(cellAlpha(count)) }}
                        />
                      ))}
                    </div>
                  ))}
                  {/* Hour axis */}
                  <span aria-hidden="true" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <span key={h} className="t-num pt-1 text-[11px] leading-none text-fg-faint" aria-hidden="true">
                      {h % 6 === 0 ? h : ""}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1 pl-[31px]">
                  <span className="mr-1 text-[11px] text-fg-faint">Less</span>
                  {[0.05, 0.2, 0.45, 0.7, 0.95].map((a) => (
                    <span key={a} className="size-2.5 rounded-[2px]" style={{ backgroundColor: heatColor(a) }} aria-hidden="true" />
                  ))}
                  <span className="ml-1 text-[11px] text-fg-faint">More</span>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </Page>
  );
}
