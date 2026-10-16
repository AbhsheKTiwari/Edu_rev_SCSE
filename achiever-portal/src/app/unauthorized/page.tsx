import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { firstParam, type SearchParams } from "@/lib/types";

export const metadata: Metadata = { title: "Access denied", robots: { index: false } };

export default async function UnauthorizedPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const notConfigured = firstParam(sp.reason) === "not-configured";
  return (
    <PublicShell>
      <div className="auth-card" style={{ textAlign: "center", alignItems: "center" }}>
        <ShieldAlert size={44} aria-hidden="true" color="var(--brand-text)" />
        <h1 style={{ margin: 0, fontSize: 28 }}>{notConfigured ? "Portal not connected yet" : "Access denied"}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {notConfigured
            ? "The sign-in portals need a Supabase project. The administrator must set the Supabase environment variables."
            : "Your account does not have permission to view this page. If you think this is a mistake, contact the portal administrator."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/">
            Go to homepage
          </Link>
          <Link className="btn btn-ghost" href="/portal">
            My portal
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
