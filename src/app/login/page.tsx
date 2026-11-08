import type { Metadata } from "next";
import { AuthShell, PrivateRecordAside } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in · Veiled",
};

export default function LoginPage() {
  return (
    <AuthShell aside={<PrivateRecordAside />} switchPrompt={{ text: "New to Veiled?", label: "Create an account", href: "/signup" }}>
      <LoginForm />
    </AuthShell>
  );
}
