import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { OtpLoginForm } from "@/components/otp-login-form";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Redeem faculty invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const { user, profile } = await getSession();

  return (
    <PublicShell>
      <div className="auth-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="eyebrow">Faculty access</span>
          <h1 style={{ margin: 0, fontSize: 28 }}>Redeem your invitation</h1>
          <p className="muted" style={{ margin: 0 }}>
            Step 1: verify your own email address. Step 2: enter the invitation code the administrator gave you.
          </p>
        </div>

        {!isSupabaseConfigured() ? (
          <div className="alert alert-warn">Supabase is not configured yet.</div>
        ) : !user ? (
          <>
            <h2 style={{ margin: 0, fontSize: 18 }}>Step 1 · Verify your email</h2>
            <OtpLoginForm portal="invite" />
          </>
        ) : profile?.role === "faculty" ? (
          <div className="alert alert-ok">
            You already have faculty access. <Link href="/faculty/dashboard">Go to your dashboard</Link>.
          </div>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Signed in as <strong>{user.email}</strong>.
            </p>
            <h2 style={{ margin: 0, fontSize: 18 }}>Step 2 · Enter invitation code</h2>
            <RedeemForm />
          </>
        )}
      </div>
    </PublicShell>
  );
}
