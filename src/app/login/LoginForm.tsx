"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Notice } from "@/components/app/ui";
import { AuthHeading } from "@/components/auth/AuthHeading";

type Status = "idle" | "loading" | "error";

export function LoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "That email and password didn't match our records. Double-check them and try again."
          : error.message
      );
      return;
    }

    router.push("/app");
    router.refresh();
  }

  const loading = status === "loading";

  return (
    <>
      <AuthHeading title="Welcome back" body="Log in to your Veiled account." />

      {status === "error" && (
        <Notice tone="danger" className="mb-6">
          {errorMessage}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            aria-invalid={status === "error" || undefined}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <Link href="#" className="rounded text-[13px] text-fg-muted transition-colors hover:text-fg">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="input !h-11"
            placeholder="Your password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            disabled={loading}
            aria-invalid={status === "error" || undefined}
          />
        </div>

        <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary btn-lg mt-1 w-full">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-[13px] leading-relaxed text-fg-faint">
        Veiled never holds your keys or sees your balances.
      </p>
    </>
  );
}
