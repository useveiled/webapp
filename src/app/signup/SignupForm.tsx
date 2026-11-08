"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notice } from "@/components/app/ui";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "error" | "success";

const ROLES = [
  { value: "human", label: "Just me", hint: "A personal account" },
  { value: "agent", label: "My agents", hint: "Accounts for AI agents" },
  { value: "both", label: "Both", hint: "Me and my agents" },
];

export function SignupForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [role, setRole] = useState("both");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const name = [form.firstName, form.lastName].filter(Boolean).join(" ");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: name, role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("success");
  }

  const loading = status === "loading";
  const passwordLongEnough = form.password.length >= 8;

  if (status === "success") {
    return (
      <div role="status">
        <span className="flex size-11 items-center justify-center rounded-[12px] bg-ok/12 text-ok">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="m3.5 6 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="mt-6">
          <AuthHeading
            title="Check your email"
            body={
              <>
                We sent a confirmation link to <span className="break-all font-medium text-fg">{form.email}</span>. Open it
                on this device and your account goes live.
              </>
            }
          />
        </div>
        <Link href="/" className="btn btn-secondary btn-lg w-full">
          Back to home
        </Link>
        <p className="mt-6 text-[13px] text-fg-faint">Nothing arrived after a few minutes? Check spam, or sign up again with the right address.</p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Open your account" body="Free to open. Non-custodial from the first deposit." />

      {status === "error" && (
        <Notice tone="danger" className="mb-6">
          {errorMessage}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset>
          <legend className="field-label">Who is the account for?</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((opt) => {
              const selected = role === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-0.5 rounded-[12px] border px-3 py-2.5 transition-colors",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal",
                    selected ? "border-signal/45 bg-signal/[0.08]" : "border-line-strong bg-ink-1 hover:border-white/20"
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selected}
                    onChange={() => setRole(opt.value)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <span className={cn("text-[13.5px] font-medium", selected ? "text-fg" : "text-fg-body")}>{opt.label}</span>
                  <span className="text-[11.5px] leading-snug text-fg-faint">{opt.hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 min-[420px]:gap-3">
          <div>
            <label htmlFor="first-name" className="field-label">
              First name
            </label>
            <input
              id="first-name"
              type="text"
              className="input !h-11"
              placeholder="Ada"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="last-name" className="field-label">
              Last name <span className="font-normal text-fg-faint">(optional)</span>
            </label>
            <input
              id="last-name"
              type="text"
              className="input !h-11"
              placeholder="Okafor"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input !h-11"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input !h-11"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            disabled={loading}
          />
          <div id="password-hint" className={cn("field-hint flex items-center gap-1.5", passwordLongEnough && "!text-ok")}>
            <span aria-hidden="true">{passwordLongEnough ? "✓" : "·"}</span>
            8 or more characters
          </div>
        </div>

        <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary btn-lg mt-1 w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </>
  );
}
