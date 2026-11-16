"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Alert, AlertPreference } from "@/lib/supabase/database.types";
import { Page, PageHeader, Panel, EmptyState } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const TYPE_CFG: Record<Alert["type"], { badge: string; label: string }> = {
  transfer: { badge: "", label: "Transfer" },
  policy: { badge: "badge-warn", label: "Policy" },
  security: { badge: "badge-danger", label: "Security" },
  system: { badge: "", label: "System" },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block h-[18px] w-8 shrink-0 rounded-full transition-colors",
        on ? "bg-signal" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-3 rounded-full transition-[left,background-color]",
          on ? "left-[17px] bg-ink-0" : "left-[3px] bg-fg-muted",
        )}
      />
    </span>
  );
}

function RowSkeleton() {
  return (
    <div className="flex gap-3.5 px-5 py-4" aria-hidden="true">
      <div className="flex-1">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton mt-2 h-3.5 w-4/5" />
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setSignedIn(false);
          setLoading(false);
        }
        return;
      }

      const [{ data: alertRows }, { data: prefRows }] = await Promise.all([
        supabase
          .from("alerts")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("alert_preferences")
          .select("*")
          .eq("profile_id", user.id),
      ]);

      if (cancelled) return;
      setNotifications(alertRows ?? []);
      setRules(prefRows ?? []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const visible = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const supabase = createClient();
    const { error } = await supabase.from("alerts").update({ read: true }).eq("id", id);
    if (error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const supabase = createClient();
    const { error } = await supabase.from("alerts").update({ read: true }).in("id", unreadIds);
    if (error) {
      setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: false } : n)));
    }
  }

  async function toggleRule(rule: AlertPreference) {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    const supabase = createClient();
    const { error } = await supabase
      .from("alert_preferences")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);
    if (error) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)));
    }
  }

  return (
    <Page className="max-w-[880px]">
      <PageHeader
        title="Alerts"
        description={loading ? "Loading notifications and alert preferences." : "Notifications and alert preferences."}
      />

      {/* Notifications */}
      <Panel padded={false} className="mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="segmented" role="group" aria-label="Filter notifications">
            {(["all", "unread"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className="capitalize">
                {f}
                {f === "unread" && unreadCount > 0 ? <span className="t-num ml-1 text-fg-muted">{unreadCount}</span> : null}
              </button>
            ))}
          </div>
          <button type="button" onClick={markAllRead} disabled={unreadCount === 0} className="btn btn-ghost btn-sm">
            Mark all read
          </button>
        </div>

        {loading && (
          <div className="divided">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        )}

        {!loading && !signedIn && (
          <EmptyState
            title="Sign in to see your notifications"
            action={<Link href="/login" className="btn btn-secondary btn-sm">Sign in</Link>}
          />
        )}

        {!loading && signedIn && visible.length === 0 && (
          <EmptyState
            title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description={filter === "unread" ? "You are all caught up." : "Transfers, policy and security events will show up here."}
            action={
              filter === "unread" && notifications.length > 0 ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilter("all")}>
                  Show all
                </button>
              ) : undefined
            }
          />
        )}

        {!loading && signedIn && visible.length > 0 && (
          <ul className="divided">
            {visible.map((n) => {
              const cfg = TYPE_CFG[n.type];
              return (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  onKeyDown={(e) => {
                    if (!n.read && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      markRead(n.id);
                    }
                  }}
                  role={n.read ? undefined : "button"}
                  tabIndex={n.read ? undefined : 0}
                  aria-label={n.read ? undefined : `${n.title}, unread. Mark as read`}
                  className={cn(
                    "flex gap-3 px-5 py-3.5 transition-colors focus-visible:outline-offset-[-2px]",
                    !n.read && "cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex w-1.5 shrink-0 pt-[7px]" aria-hidden="true">
                    {!n.read && <span className="size-1.5 rounded-full bg-signal" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("text-[13.5px] text-fg", n.read ? "font-normal" : "font-medium")}>{n.title}</span>
                      <span className={cn("badge", cfg.badge)}>{cfg.label}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-body">{n.body}</p>
                    <div className="mt-1 text-[12px] text-fg-faint">{timeAgo(n.created_at)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Alert rules */}
      <Panel padded={false} className="overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Notification preferences</h2>
        </div>

        {loading && (
          <div className="divided" aria-hidden="true">
            {[0, 1, 2].map((k) => (
              <div key={k} className="flex items-center justify-between px-5 py-3.5">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-[18px] w-8 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && !signedIn && (
          <p className="px-5 py-6 text-[13px] text-fg-muted">Sign in to manage your alert preferences.</p>
        )}

        {!loading && signedIn && rules.length === 0 && (
          <p className="px-5 py-6 text-[13px] text-fg-muted">No alert preferences configured yet.</p>
        )}

        {!loading && signedIn && rules.length > 0 && (
          <ul className="divided">
            {rules.map((rule) => (
              <li key={rule.id}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  onClick={() => toggleRule(rule)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-offset-[-2px]"
                >
                  <span className="text-[13.5px] text-fg-body">{rule.label}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="hidden text-[12.5px] text-fg-faint sm:inline">{rule.enabled ? "On" : "Off"}</span>
                    <Toggle on={rule.enabled} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
