import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { FileList } from "@/components/file-list";
import { EvaluationStatusBadge, SubmissionStatusBadge } from "@/components/ui/status";
import { loadSettings } from "@/lib/settings";
import { rowsOf, type AssignmentRow, type EvaluationRow, type SubmissionFileRow, type SubmissionRow } from "@/lib/types";
import { EvaluationForm } from "./evaluation-form";

export const metadata: Metadata = { title: "Evaluate submission" };

type Params = Promise<{ id: string }>;

export default async function FacultySubmissionPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await requireRole("faculty");

  const { data: aData } = await supabase
    .from("evaluation_assignments")
    .select("id, submission_id, faculty_id, due_at, created_at")
    .eq("submission_id", id)
    .eq("faculty_id", user.id)
    .maybeSingle();
  const assignment = aData as AssignmentRow | null;
  if (!assignment) notFound(); // not assigned → behaves as if it doesn't exist

  const [{ data: sData }, { data: fData }, { data: eData }, settings] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, reference_code, student_name, student_vid, title, description, category, team_members, submission_date, public_summary, project_url, status, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("submission_files").select("id, submission_id, original_name, mime_type, size_bytes, created_at").eq("submission_id", id),
    supabase
      .from("evaluations")
      .select("id, submission_id, evaluator_id, recommendation, score, criteria_scores, private_remarks, status, submitted_at, reopened_at")
      .eq("submission_id", id)
      .eq("evaluator_id", user.id)
      .maybeSingle(),
    loadSettings(supabase),
  ]);
  const sub = sData as SubmissionRow | null;
  if (!sub) notFound();
  const evaluation = eData as EvaluationRow | null;
  const files = rowsOf<SubmissionFileRow>(fData);

  return (
    <>
      <div>
        <Link href="/faculty/dashboard" className="small">
          ← My evaluations
        </Link>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          {sub.title}
        </h1>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <SubmissionStatusBadge status={sub.status} />
          <EvaluationStatusBadge status={evaluation ? evaluation.status : "pending"} />
          {assignment.due_at && <span className="badge badge-neutral">Due {fmtDateTime(assignment.due_at)}</span>}
        </div>
      </div>

      <div className="panel">
        <h2>Submission</h2>
        <dl className="dl">
          <dt>Reference</dt>
          <dd>{sub.reference_code}</dd>
          <dt>Student</dt>
          <dd>
            {sub.student_name} · {sub.student_vid}
          </dd>
          <dt>Category</dt>
          <dd>{sub.category}</dd>
          <dt>Submission date</dt>
          <dd>{sub.submission_date}</dd>
          <dt>Team</dt>
          <dd>{sub.team_members.length ? sub.team_members.join(", ") : "—"}</dd>
          <dt>Project link</dt>
          <dd>
            {sub.project_url ? (
              <a href={sub.project_url} target="_blank" rel="noopener noreferrer nofollow">
                {sub.project_url}
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Description</dt>
          <dd style={{ whiteSpace: "pre-wrap" }}>{sub.description}</dd>
        </dl>
      </div>

      <div className="panel">
        <h2>Evidence</h2>
        <FileList files={files} />
      </div>

      <div className="panel">
        <h2>Your evaluation</h2>
        {evaluation?.status === "submitted" ? (
          <div className="form">
            <div className="alert alert-ok" role="status">
              Submitted {fmtDateTime(evaluation.submitted_at)}. Final evaluations are locked;
              the administrator can reopen it if a correction is needed.
            </div>
            <dl className="dl">
              <dt>Recommendation</dt>
              <dd>{evaluation.recommendation === "yes" ? "Yes" : "No"}</dd>
              <dt>Score</dt>
              <dd>{evaluation.score ?? "—"}</dd>
              <dt>Private remarks</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{evaluation.private_remarks ?? "—"}</dd>
            </dl>
          </div>
        ) : (
          <EvaluationForm submissionId={sub.id} rubricEnabled={settings.rubric_enabled} existing={evaluation} />
        )}
      </div>
    </>
  );
}
