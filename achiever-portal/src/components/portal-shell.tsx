import { LogOut } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PortalNav, type NavItem } from "@/components/portal-nav";
import { signOut } from "@/lib/actions/auth";
import { logoUrl, portalName } from "@/lib/env";

export function PortalShell({
  roleLabel,
  userLabel,
  items,
  children,
}: {
  roleLabel: string;
  userLabel: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader portalName={portalName} logoUrl={logoUrl} />
      <div className="portal">
        <aside className="portal-side" aria-label={`${roleLabel} navigation`}>
          <div className="portal-role">
            {roleLabel}
            <div style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, marginTop: 6, overflowWrap: "anywhere" }}>{userLabel}</div>
          </div>
          <PortalNav items={items} />
          <form action={signOut} style={{ marginTop: "auto" }}>
            <button type="submit" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}>
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </form>
        </aside>
        <main id="main" className="portal-main">
          {children}
        </main>
      </div>
    </>
  );
}
