import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { OtpLoginForm } from "@/components/otp-login-form";
import type { PortalKind } from "@/lib/actions/auth";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthPage({
  portal,
  title,
  intro,
  footer,
  linkError,
}: {
  portal: PortalKind;
  title: string;
  intro: string;
  footer?: React.ReactNode;
  linkError?: boolean;
}) {
  return (
    <PublicShell>
      <div className="auth-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="eyebrow">Secure sign-in</span>
          <h1 style={{ margin: 0, fontSize: 28 }}>{title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {intro}
          </p>
        </div>
        {linkError && (
          <div className="alert alert-error" role="alert">
            That sign-in link is invalid or has expired. Request a new code below.
          </div>
        )}
        {isSupabaseConfigured() ? (
          <OtpLoginForm portal={portal} />
        ) : (
          <div className="alert alert-warn" role="status">
            Sign-in is not available yet: the administrator has not connected Supabase. See docs/DEPLOYMENT.md.
          </div>
        )}
        {footer}
        <Link href="/" className="small">
          ← Back to homepage
        </Link>
      </div>
    </PublicShell>
  );
}
