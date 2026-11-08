import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Open an account · Veiled",
};

const BENEFITS = [
  { title: "Encrypted end to end", body: "Balances and amounts are sealed in confidential token accounts on Solana." },
  { title: "Accounts for your agents", body: "Each agent gets its own account, held to a spending policy the chain enforces." },
  { title: "Disclosure on your terms", body: "Share a view key with an accountant without handing over custody." },
  { title: "Your keys, always", body: "Fully non-custodial. Your money never sits in anyone else's hands." },
];

function SignupAside() {
  return (
    <div className="max-w-[560px]">
      <h2 className="t-h2 max-w-[480px]">A bank account with no audience.</h2>
      <ul className="glass border-gradient divided mt-8 rounded-[18px] px-5">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3.5 py-4">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.2 4.1 7.2 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="text-[14.5px] font-medium text-fg">{b.title}</div>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-fg-muted">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-fg-faint">In beta on Solana.</p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell aside={<SignupAside />} switchPrompt={{ text: "Already have an account?", label: "Log in", href: "/login" }}>
      <SignupForm />
    </AuthShell>
  );
}
