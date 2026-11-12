/* Shared primitives for the /app dashboard.
   Styling lives in globals.css (.surface, .glass, .btn-*, .badge-*, .input,
   .data-table, .t-*). These components only fix structure and spacing so
   every page reads as one system. */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Page wrapper: consistent width and gutters for every /app page. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8", className)}>
      {children}
    </div>
  );
}

/* Title row. One primary action at most goes in `actions`. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-fg">{title}</h1>
        {description && <p className="mt-1.5 max-w-[640px] text-[14px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* Flat content surface. Use for groups of related content. Do not nest. */
export function Panel({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <section className={cn("surface", padded && "p-5", className)}>{children}</section>;
}

/* Header row inside a Panel. */
export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* A single metric. Label above, value below, optional context line. */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[12.5px] text-fg-muted">{label}</div>
      <div className="t-num mt-1 truncate text-[22px] font-semibold tracking-[-0.02em] text-fg">{value}</div>
      {hint && <div className="mt-1 text-[12px] text-fg-faint">{hint}</div>}
    </div>
  );
}

/* Empty state: say what is missing and offer the one next step. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="text-[15px] font-medium text-fg">{title}</div>
      {description && <p className="mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* Inline error / notice banner. */
export function Notice({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-white/[0.03] text-fg-body",
    ok: "border-ok/25 bg-ok/10 text-ok",
    warn: "border-warn/25 bg-warn/10 text-warn",
    danger: "border-danger/25 bg-danger/10 text-danger",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-[10px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

/* Labeled form field wrapper. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/* Modal / drawer scaffold: glass over a dimmed page. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[rgba(3,5,9,0.6)] backdrop-blur-[3px]" onClick={onClose} />
      <div
        className="glass-strong border-gradient veil-in relative flex max-h-[90vh] w-full flex-col rounded-t-[20px] sm:rounded-[20px]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
            {description && <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-icon -mr-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
