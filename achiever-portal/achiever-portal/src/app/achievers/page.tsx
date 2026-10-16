import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { searchArchive } from "@/lib/achievements";
import { formatShort } from "@/lib/dates";
import { ordinal } from "@/lib/podium";
import { CATEGORIES, firstParam, type SearchParams } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Achievement archive" };

const PAGE_SIZE = 24;

export default async function ArchivePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = firstParam(sp.q).slice(0, 80);
  const categoryRaw = firstParam(sp.category);
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "";
  const page = Math.max(1, Math.min(500, Number(firstParam(sp.page)) || 1));

  const { items, total, error } = await searchArchive({ q, category, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (category) u.set("category", category);
    u.set("page", String(p));
    return `/achievers?${u.toString()}`;
  };

  return (
    <PublicShell>
      <section className="ach-section">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="eyebrow">Archive</span>
            <h1 className="ach-title">Achievement archive</h1>
            <p className="muted" style={{ margin: 0 }}>
              Every published daily and weekly achievement. Search by student name or achievement title.
            </p>
          </div>

          <form className="filters panel" role="search" action="/achievers">
            <div className="field" style={{ flex: "3 1 260px" }}>
              <label htmlFor="q">Search</label>
              <input id="q" name="q" className="input" defaultValue={q} placeholder="Name or achievement title" maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" className="select" defaultValue={category}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit">
              <Search size={18} aria-hidden="true" /> Search
            </button>
          </form>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <p className="small muted" style={{ margin: 0 }} aria-live="polite">
            {total} result{total === 1 ? "" : "s"}
          </p>

          {items.length === 0 && !error ? (
            <div className="empty">
              <h3>No achievements found</h3>
              <p>Try a different name, title or category.</p>
            </div>
          ) : (
            <ul className="gallery">
              {items.map((a) => (
                <li key={a.id} className="g-card">
                  <div className="g-avatar" aria-hidden="true">
                    {a.initials}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    <span className="small muted">
                      {ordinal(a.rank)} · {a.periodType === "day" ? "Day" : "Week"} of{" "}
                      <Link href={a.periodType === "day" ? `/achievers/day/${a.periodStart}` : `/achievers/week/${a.periodStart}`}>
                        {formatShort(a.periodStart)}
                      </Link>
                    </span>
                    <span style={{ font: "600 17px/1.3 var(--f-display)" }}>{a.displayName}</span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>{a.title}</span>
                    <div>
                      <span className="cat">{a.category}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
              {page > 1 && (
                <Link className="btn btn-ghost" href={qs(page - 1)}>
                  Previous
                </Link>
              )}
              <span className="small muted">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link className="btn btn-ghost" href={qs(page + 1)}>
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
