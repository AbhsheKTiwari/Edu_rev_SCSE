import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { buildSubmissionQuery, readFilters } from "@/lib/admin-queries";
import { EmptyState, FlashFromParams, Notice, SubmissionStatusBadge } from "@/components/ui/status";
import { CATEGORIES, firstParam, rowsOf, SUBMISSION_STATUSES, type SearchParams, type SubmissionRow } from "@/lib/types";

export const metadata: Metadata = { title: "Submissions" };

const PAGE_SIZE = 50;

export default async function AdminSubmissions({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const f = readFilters((k) => firstParam(sp[k]));
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const { data, error, count } = await buildSubmissionQuery(supabase, f, { count: true }).range(from, from + PAGE_SIZE - 1);
  const rows = rowsOf<SubmissionRow>(data);
  const ids = rows.map((r) => r.id);

  const [{ data: aData }, { data: eData }] = await Promise.all([
    ids.length ? supabase.from("evaluation_assignments").select("submission_id").in("submission_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("evaluations").select("submission_id, status").in("submission_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const assigned = new Map<string, number>();
  rowsOf<{ submission_id: string }>(aData).forEach((a) => assigned.set(a.submission_id, (assigned.get(a.submission_id) ?? 0) + 1));
  const done = new Map<string, number>();
  rowsOf<{ submission_id: string; status: string }>(eData).forEach((e) => {
    if (e.status === "submitted") done.set(e.submission_id, (done.get(e.submission_id) ?? 0) + 1);
  });

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const u = new URLSearchParams(qs);
    u.set("page", String(p));
    return `/admin/submissions?${u.toString()}`;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Administrator</span>
          <h1 className="page-title">Submissions</h1>
        </div>
        <a className="btn btn-ghost" href={`/admin/export?${qs.toString()}`}>
          <Download size={18} aria-hidden="true" /> Export CSV
        </a>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />

      <form className="filters panel" role="search">
        <div className="field" style={{ flex: "3 1 240px" }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" className="input" defaultValue={f.q} placeholder="VID, name, title, reference or ID" />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" className="select" defaultValue={f.category}>
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="select" defaultValue={f.status}>
            <option value="">All</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" className="input" defaultValue={f.from} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" className="input" defaultValue={f.to} />
        </div>
        <button className="btn btn-primary" type="submit">
          Apply
        </button>
      </form>

      {error && <Notice kind="error">Could not load submissions.</Notice>}
      <p className="small muted" style={{ margin: 0 }}>
        {total} submission{total === 1 ? "" : "s"}
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No submissions match" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Title</th>
                <th scope="col">Student · VID</th>
                <th scope="col">Category</th>
                <th scope="col">Date</th>
                <th scope="col">Reviews</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/submissions/${r.id}`}>{r.reference_code}</Link>
                  </td>
                  <td>{r.title}</td>
                  <td>
                    {r.student_name}
                    <div className="small muted">{r.student_vid}</div>
                  </td>
                  <td>{r.category}</td>
                  <td>{r.submission_date}</td>
                  <td>
                    {assigned.get(r.id) ? `${done.get(r.id) ?? 0}/${assigned.get(r.id)} done` : <span className="badge badge-neutral">Not assigned</span>}
                  </td>
                  <td>
                    <SubmissionStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {page > 1 && (
            <Link className="btn btn-ghost btn-sm" href={pageHref(page - 1)}>
              Previous
            </Link>
          )}
          <span className="small muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn btn-ghost btn-sm" href={pageHref(page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
