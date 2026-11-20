"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Notice, Panel, Stat } from "@/components/app/ui";

type ServiceStatus = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
  uptime: number;
  responseTime: number;
  lastChecked: string;
}

interface IncidentUpdate {
  timestamp: string;
  status: string;
  message: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  affectedServices: string[];
  startTime: string;
  endTime?: string;
  duration?: string;
  updates: IncidentUpdate[];
}

interface StatusResponse {
  overall: ServiceStatus;
  uptime: number;
  uptimePeriod: string;
  avgResponseTime: number;
  avgResponseTimeLabel: string;
  services: Service[];
  incidents: { current: Incident[]; past: Incident[] };
  timestamp: string;
}

type Tone = "ok" | "warn" | "danger" | "signal" | "neutral";

const STATUS_META: Record<ServiceStatus, { label: string; tone: Tone }> = {
  operational: { label: "Operational", tone: "ok" },
  degraded: { label: "Degraded", tone: "warn" },
  partial_outage: { label: "Partial outage", tone: "warn" },
  major_outage: { label: "Major outage", tone: "danger" },
  maintenance: { label: "Maintenance", tone: "signal" },
};

function metaFor(status: string) {
  return STATUS_META[status as ServiceStatus] ?? { label: status, tone: "neutral" as Tone };
}

const BADGE_CLASS: Record<Tone, string> = {
  ok: "badge badge-ok",
  warn: "badge badge-warn",
  danger: "badge badge-danger",
  signal: "badge badge-signal",
  neutral: "badge",
};

const TEXT_CLASS: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  signal: "text-signal",
  neutral: "text-fg-faint",
};

function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={BADGE_CLASS[tone]}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="mx-auto max-w-[860px] px-4 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-40">{children}</div>
      </div>
      <Footer />
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="t-h3 mb-3 mt-12">{children}</h2>;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("https://api.useveiled.com/v1/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as StatusResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("We couldn't reach the status service. Refresh the page to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && !data) {
    return (
      <Shell>
        <StatusHeader />
        <div className="surface mt-8 p-5" aria-busy="true">
          <p className="t-small mb-4">Checking all systems...</p>
          <div className="flex flex-col gap-3">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-3/5" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <StatusHeader />
        <Notice tone="danger" className="mt-8">
          {error ?? "We couldn't load status data."}
        </Notice>
      </Shell>
    );
  }

  const overall = metaFor(data.overall);
  const allOperational = data.overall === "operational";

  return (
    <Shell>
      <StatusHeader />

      {/* Overall status line */}
      <div className="surface mt-8 flex items-center gap-3 px-5 py-4">
        {allOperational ? (
          <span className="pulse-dot shrink-0" aria-hidden="true" />
        ) : (
          <span className={`dot size-2! ${TEXT_CLASS[overall.tone]}`} aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className={`text-[16px] font-semibold ${allOperational ? "text-fg" : TEXT_CLASS[overall.tone]}`}>
            {allOperational ? "All systems operational" : overall.label}
          </div>
          <div className="t-small mt-0.5">Last updated {formatTime(data.timestamp)}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel>
          <Stat label="Uptime" value={`${data.uptime}%`} hint={data.uptimePeriod} />
        </Panel>
        <Panel>
          <Stat label={data.avgResponseTimeLabel} value={`${data.avgResponseTime}ms`} hint="Average response time" />
        </Panel>
      </div>

      {/* Services */}
      <SectionTitle>Services</SectionTitle>
      <div className="surface divided overflow-hidden">
        {data.services.map((service) => {
          const meta = metaFor(service.status);
          return (
            <div key={service.name} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-fg">{service.name}</div>
                <div className="t-num mt-0.5 text-[12.5px] text-fg-faint">
                  {service.uptime}% uptime · {service.responseTime}ms
                </div>
              </div>
              <StatusBadge tone={meta.tone} label={meta.label} />
            </div>
          );
        })}
      </div>

      {/* Incidents */}
      <SectionTitle>Incident history</SectionTitle>

      {data.incidents.current.length === 0 && data.incidents.past.length === 0 ? (
        <Panel>
          <p className="t-body text-fg-muted">No incidents reported. All quiet.</p>
        </Panel>
      ) : (
        <div className="surface divided overflow-hidden">
          {data.incidents.current.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} ongoing />
          ))}
          {data.incidents.past.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}
    </Shell>
  );
}

function StatusHeader() {
  return (
    <header>
      <h1 className="text-[clamp(32px,4.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-fg">
        System status
      </h1>
      <p className="t-lead mt-3">Real-time health across the Veiled platform and its services.</p>
    </header>
  );
}

function IncidentCard({ incident, ongoing }: { incident: Incident; ongoing?: boolean }) {
  const [open, setOpen] = useState(Boolean(ongoing));
  const panelId = `incident-${incident.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {ongoing ? (
              <StatusBadge tone="danger" label="Ongoing" />
            ) : (
              <span className="badge capitalize">{incident.status}</span>
            )}
            <span className="t-num text-[12.5px] text-fg-faint">
              {formatTime(incident.startTime)}
              {incident.duration ? ` · ${incident.duration}` : ""}
            </span>
          </div>
          <div className="text-[14px] font-medium text-fg">{incident.title}</div>
          {incident.affectedServices.length > 0 && (
            <div className="mt-1 text-[12.5px] text-fg-muted">Affected: {incident.affectedServices.join(", ")}</div>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className={`mt-1 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="border-t border-line px-5 pb-5">
          <p className="t-body mb-4 mt-4 text-[14px] text-fg-muted">{incident.description}</p>
          <ol className="flex flex-col gap-4">
            {incident.updates.map((update, i) => {
              const uMeta = metaFor(update.status);
              return (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <span
                      className={`dot ${uMeta.tone === "neutral" ? "text-signal" : TEXT_CLASS[uMeta.tone]}`}
                      aria-hidden="true"
                    />
                    {i < incident.updates.length - 1 && <span className="mt-1 min-h-4 w-px flex-1 bg-line-strong" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium capitalize text-fg">{update.status}</span>
                      <span className="t-num text-[12px] text-fg-faint">{formatTime(update.timestamp)}</span>
                    </div>
                    <p className="text-[13.5px] leading-relaxed text-fg-body">{update.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
