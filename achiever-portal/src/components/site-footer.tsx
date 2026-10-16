import Link from "next/link";
import { institutionName, portalName } from "@/lib/env";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        <div className="foot-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: "700 22px/1 var(--f-display)", color: "#fff" }}>{portalName}</span>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#cfcbc6" }}>
              A student recognition portal for {institutionName}. Achievements are published only after administrator approval.
            </p>
            <address style={{ fontStyle: "normal", fontSize: 14, lineHeight: 1.7, color: "#cfcbc6" }}>
              {institutionName}
              <br />
              [Campus address line]
              <br />
              [City, State, PIN]
            </address>
          </div>
          <nav aria-label="Explore" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="foot-head">Explore</span>
            <Link href="/#achievers">Daily achievers</Link>
            <Link href="/achievers">Achievement archive</Link>
            <Link href="/#categories">Categories</Link>
            <Link href="/#recent">Recent achievements</Link>
          </nav>
          <nav aria-label="Portals" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="foot-head">Portals</span>
            <Link href="/student/login">Student login</Link>
            <Link href="/student/submit">Submit a project</Link>
            <Link href="/faculty/login">Faculty login</Link>
            <Link href="/admin/login">Administrator</Link>
          </nav>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <span className="foot-head">Contact</span>
            <span>[recognition-office@example.edu]</span>
            <span>[+91 XXXXX XXXXX]</span>
            <span style={{ color: "#cfcbc6" }}>[Office hours]</span>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,.18)",
            paddingTop: 20,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            color: "#cfcbc6",
          }}
        >
          <span>
            © {year} {institutionName}
          </span>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/privacy#terms">Terms of use</Link>
            <Link href="/privacy#accessibility">Accessibility</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
