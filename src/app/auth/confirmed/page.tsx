import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, AuthHeading, PrivateRecordAside } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Email confirmed · Veiled",
};

export default function EmailConfirmedPage() {
  return (
    <AuthShell aside={<PrivateRecordAside />}>
      <span className="badge badge-ok mb-6">
        <span className="dot" />
        Email confirmed
      </span>
      <AuthHeading title="You're all set" body="Your account is active. Open the app to make your first deposit or set up an agent." />
      <Link href="/app" className="btn btn-primary btn-lg w-full">
        Open the app
      </Link>
    </AuthShell>
  );
}
