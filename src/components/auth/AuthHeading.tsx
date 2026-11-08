import type { ReactNode } from "react";

/* Shared heading block for the task column. */
export function AuthHeading({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.015em] text-fg">{title}</h1>
      {body && <p className="t-body mt-3 text-fg-muted">{body}</p>}
    </div>
  );
}
