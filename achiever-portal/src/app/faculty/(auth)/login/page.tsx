import type { Metadata } from "next";
import Link from "next/link";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Faculty login", robots: { index: false } };

export default function FacultyLogin() {
  return (
    <AuthPage
      portal="faculty"
      title="Faculty login"
      intro="Sign in with the email address your faculty access was granted to."
      footer={
        <p className="small muted" style={{ margin: 0 }}>
          Received an invitation code? <Link href="/faculty/invite">Redeem it here</Link>.
        </p>
      }
    />
  );
}
