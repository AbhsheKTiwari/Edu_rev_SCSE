import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { logoUrl, portalName } from "@/lib/env";
import { usingDemoData } from "@/lib/achievements";

/** Header + optional demo banner + footer around public pages. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const demo = usingDemoData();
  return (
    <>
      {demo && (
        <div role="note" className="demo-banner">
          <strong>DEMO MODE</strong> · Every name, achievement and date shown is a synthetic example — not a real student or official result.
        </div>
      )}
      <SiteHeader portalName={portalName} logoUrl={logoUrl} />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
