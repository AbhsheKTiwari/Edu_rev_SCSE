import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { PublicAchiever } from "@/lib/types";
import { formatShort } from "@/lib/dates";

export function AboutHero() {
  return (
    <section aria-labelledby="hero-h" className="section-alt">
      <div className="wrap hero-grid" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span className="eyebrow">Daily &amp; weekly recognition</span>
          <h2 id="hero-h" style={{ margin: 0, font: "700 clamp(32px, 4.2vw, 50px)/1.1 var(--f-display)", letterSpacing: "-.01em" }}>
            Celebrating Student Excellence
          </h2>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.65, color: "var(--ink-2)", maxWidth: 560 }}>
            Every day and every week, faculty reviewers recognise students whose research, innovation, projects, placements and
            ventures stand out. Approved achievements are published here for the whole campus to see.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            <Link className="btn btn-primary" href="/student/submit">
              Submit a project
            </Link>
            <Link className="btn btn-outline" href="#categories">
              How recognition works
            </Link>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Only achievements approved by the portal administrator are published.
          </p>
        </div>
        <figure
          className="ph"
          style={{ margin: 0, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", minHeight: 320, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--ink-3)" }}>
            <ImageIcon size={56} strokeWidth={1.4} aria-hidden="true" />
          </div>
          <figcaption style={{ background: "rgba(255,255,255,.92)", padding: "14px 18px", fontSize: 13, color: "var(--ink-2)", borderTop: "1px solid var(--line)" }}>
            Placeholder — replace with an approved campus photograph
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

const CATEGORY_INFO = [
  { mark: "R", name: "Research", desc: "Papers, studies, patents and original investigation." },
  { mark: "P", name: "Placement", desc: "Job offers, pre-placement offers and internships." },
  { mark: "₹", name: "Revenue Generation", desc: "Ventures, consulting and work that earns real income." },
  { mark: "Pj", name: "Project", desc: "Built products, prototypes and applied coursework." },
  { mark: "O", name: "Other", desc: "Competitions, service, leadership and the arts." },
];

export function CategoryCards() {
  return (
    <section id="categories" aria-labelledby="cat-h" className="section section-alt">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
          <span className="eyebrow">What we recognise</span>
          <h2 id="cat-h" className="section-title">
            Categories of student accomplishment
          </h2>
        </div>
        <ul className="cat-grid">
          {CATEGORY_INFO.map((c) => (
            <li key={c.name} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <span
                aria-hidden="true"
                style={{ width: 44, height: 44, borderRadius: 10, background: "var(--brand-50)", color: "var(--brand-text)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 18px/1 var(--f-display)" }}
              >
                {c.mark}
              </span>
              <h3 style={{ margin: 0, font: "600 19px/1.3 var(--f-display)" }}>{c.name}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>{c.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ResearchAndPlacements({ research, placements }: { research: PublicAchiever[]; placements: PublicAchiever[] }) {
  return (
    <section className="section">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 64 }}>
        <div id="research" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="eyebrow">Featured</span>
              <h2 className="section-title">Research &amp; innovation</h2>
            </div>
            <Link href="/achievers?category=Research" style={{ fontWeight: 600 }}>
              Browse the archive →
            </Link>
          </div>
          {research.length === 0 ? (
            <p className="muted">Published research achievements will appear here.</p>
          ) : (
            <div className="feature-grid">
              {research.map((r) => (
                <article key={r.id} className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div className="ph" style={{ height: 150, display: "flex", alignItems: "flex-end", padding: 12 }}>
                    {r.isDemo && <span className="tag-demo">Demo record</span>}
                  </div>
                  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <span className="cat">{r.category}</span>
                    </div>
                    <h3 style={{ margin: 0, font: "600 19px/1.35 var(--f-display)" }}>{r.title}</h3>
                    {r.publicRemark && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink-2)" }}>{r.publicRemark}</p>}
                    <span className="small muted">{r.displayName}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div id="placements" className="two-col" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
            <span className="eyebrow">Careers</span>
            <h2 className="section-title">Placement achievements</h2>
            <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.65 }}>
              Offers and internships appear here only after a student submits evidence and the administrator approves it for
              publication.
            </p>
          </div>
          {placements.length === 0 ? (
            <p className="muted">Published placement achievements will appear here.</p>
          ) : (
            <ul className="card" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {placements.map((p, i) => (
                <li
                  key={p.id}
                  style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 18px", borderBottom: i < placements.length - 1 ? "1px solid var(--line)" : 0 }}
                >
                  <div className="g-avatar" aria-hidden="true">
                    {p.initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                    <span style={{ font: "600 16px/1.3 var(--f-display)" }}>{p.displayName}</span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{p.title}</span>
                  </div>
                  {p.isDemo && <span className="badge badge-neutral">Demo</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function RecentList({ items }: { items: PublicAchiever[] }) {
  return (
    <section id="recent" aria-labelledby="recent-h" className="section section-alt">
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="eyebrow">Latest</span>
          <h2 id="recent-h" className="section-title">
            Recently published achievements
          </h2>
        </div>
        {items.length === 0 ? (
          <p className="muted">Nothing has been published yet.</p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((rc) => (
              <li
                key={rc.id}
                className="card"
                style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px" }}
              >
                <time dateTime={rc.periodStart} style={{ flex: "0 0 120px", font: "600 14px/1.3 var(--f-body)", color: "var(--brand-text)" }}>
                  {formatShort(rc.periodStart)}
                </time>
                <span style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ font: "600 17px/1.3 var(--f-display)" }}>{rc.displayName}</span>
                  <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{rc.title}</span>
                </span>
                <span className="cat">{rc.category}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
