import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { EmptyState, EvaluationStatusBadge, FlashFromParams, Notice } from "@/components/ui/status";
import { CATEGORIES, firstParam, rowsOf, type AssignmentRow, type EvaluationRow, type SearchParams, type SubmissionRow } from "@/lib/types";

export const metadata: Metadata = { title: "Faculty dashboard" };

type EvalStatus = "pending" | "draft" | "submitted";

export default async function FacultyDashboard({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase, user } = await requireRole("faculty");
  const q = firstParam(sp.q).trim().toLowerCase().slice(0, 80);
  const category = firstParam(sp.category);
  const statusFilter = firstParam(sp.status) as EvalStatus | "";

  // RLS: faculty only see their own assignments and the submissions assigned to them.
  const { data: aData, error } = await supabase
    .from("evaluation_assignments")
    .select("id, submission_id, faculty_id, due_at, created_at")
    .eq("faculty_id", user.id)
    .order("due_at", { ascending: true, nullsFirst: false });
  const assignments = rowsOf<AssignmentRow>(aData);
  const ids = assignments.map((a) => a.submission_id);

  const [{ data: sData }, { data: eData }] = await Promise.all([
    ids.length
      ? supabase.from("submissions").select("id, reference_code, title, category, student_name, submission_date, status").in("id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("evaluations").select("id, submission_id, status, recommendation").eq("evaluator_id", user.id).in("submission_id", ids)
      : Promise.resolve({ data: [] }),
  ]);
  const subs = new Map(rowsOf<SubmissionRow>(sData).map((s) => [s.id, s]));
  const evals = new Map(rowsOf<EvaluationRow>(eData).map((e) => [e.submission_id, e]));

  const rows = assignments
    .map((a) => {
      const s = subs.get(a.submission_id);
      const e = evals.get(a.submission_id);
      const st: EvalStatus = e ? e.status : "pending";
      return s ? { a, s, st } : null;
    })
    .filter((r): r is { a: AssignmentRow; s: SubmissionRow; st: EvalStatus } => r !== null)
    .filter(
      (r) =>
        (!q || r.s.title.toLowerCase().includes(q) || r.s.reference_code.toLowerCase().includes(q) || r.s.student_name.toLowerCase().includes(q)) &&
        (!category || r.s.category === category) &&
        (!statusFilter || r.st === statusFilter),
    );

  const counts = { pending: 0, draft: 0, submitted: 0 };
  assignments.forEach((a) => {
    const e = evals.get(a.submission_id);
    counts[e ? e.status : "pending"] += 1;
  });
  const now = Date.now();

  return (
    <>
      <div>
        <span className="eyebrow">Faculty</span>
        <h1 className="page-title">My evaluations</h1>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} />
      {error && <Notice kind="error">Assignments could not be loaded. Please refresh.</Notice>}

      <div className="stats">
        <div className="stat">
          <b>{assignments.length}</b>
          <span>Assigned submissions</span>
        </div>
        <div className="stat">
          <b>{counts.pending + counts.draft}</b>
          <span>Pending (incl. {counts.draft} draft)</span>
        </div>
        <div className="stat">
          <b>{counts.submitted}</b>
          <span>Completed</span>
        </div>
      </div>

      <form className="filters panel" role="search">
        <div className="field" style={{ flex: "3 1 220px" }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" className="input" defaultValue={q} placeholder="Title, reference or student" />
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" className="select" defaultValue={category}>
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Evaluation status</label>
          <select id="status" name="status" className="select" defaultValue={statusFilter}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={assignments.length ? "No matches" : "No submissions assigned yet"}>
          <p>{assignments.length ? "Try different filters." : "The administrator will assign submissions to you for review."}</p>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Submissions assigned to you</caption>
            <thead>
              <tr>
                <th scope="col">Submission</th>
                <th scope="col">Student</th>
                <th scope="col">Category</th>
                <th scope="col">Deadline</th>
                <th scope="col">Your evaluation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, s, st }) => {
                const overdue = a.due_at && st !== "submitted" && Date.parse(a.due_at) < now;
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/faculty/submissions/${s.id}`}>{s.title}</Link>
                      <div className="small muted">{s.reference_code}</div>
                    </td>
                    <td>{s.student_name}</td>
                    <td>{s.category}</td>
                    <td>
                      {fmtDateTime(a.due_at)}
                      {overdue && <div className="badge badge-danger" style={{ marginTop: 4 }}>Overdue</div>}
                    </td>
                    <td>
                      <EvaluationStatusBadge status={st} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
