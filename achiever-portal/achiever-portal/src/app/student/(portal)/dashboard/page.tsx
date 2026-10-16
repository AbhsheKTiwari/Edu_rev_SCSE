import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireOnboardedStudent } from "@/lib/auth";
import { EmptyState, FlashFromParams, Notice, SubmissionStatusBadge } from "@/components/ui/status";
import { firstParam, rowsOf, type SearchParams, type SubmissionRow } from "@/lib/types";

export const metadata: Metadata = { title: "My submissions" };

export default async function StudentDashboard({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireOnboardedStudent();

  const { data, error } = await supabase
    .from("submissions")
    .select("id, reference_code, title, category, submission_date, status, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });
  const rows = rowsOf<SubmissionRow>(data);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">Welcome, {profile.full_name}</span>
          <h1 className="page-title">My submissions</h1>
        </div>
        <Link className="btn btn-primary" href="/student/submit">
          <Plus size={18} aria-hidden="true" /> New submission
        </Link>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} />
      {error && <Notice kind="error">Your submissions could not be loaded. Please refresh the page.</Notice>}
      {!error && rows.length === 0 ? (
        <EmptyState title="No submissions yet">
          <p>Share a project, research output, placement or venture for faculty review.</p>
          <Link className="btn btn-primary" href="/student/submit">
            Submit your first project
          </Link>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Your submissions and their review status</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/student/submissions/${r.id}`}>{r.reference_code}</Link>
                  </td>
                  <td>{r.title}</td>
                  <td>{r.category}</td>
                  <td>{r.submission_date}</td>
                  <td>
                    <SubmissionStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
