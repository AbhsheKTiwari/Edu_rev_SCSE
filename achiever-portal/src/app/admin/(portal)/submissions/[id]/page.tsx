import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ADMIN_SUBMISSION_COLUMNS } from "@/lib/admin-queries";
import { FileList } from "@/components/file-list";
import { EvaluationStatusBadge, FlashFromParams, Notice, SubmissionStatusBadge } from "@/components/ui/status";
import { SubmitButton } from "@/components/ui/submit-button";
import { assignReviewers, removeAssignment, reopenEvaluation, setEligibility } from "@/lib/actions/admin";
import { conflictWarnings } from "@/lib/conflicts";
import {
  firstParam,
  rowsOf,
  type AssignmentRow,
  type EvaluationRow,
  type Profile,
  type SearchParams,
  type SubmissionFileRow,
  type SubmissionRow,
} from "@/lib/types";

export const metadata: Metadata = { title: "Submission (admin)" };

type Params = Promise<{ id: string }>;

export default async function AdminSubmissionDetail({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireRole("admin");

  const [{ data: sData }, { data: fData }, { data: aData }, { data: eData }, { data: facData }] = await Promise.all([
    supabase.from("submissions").select(ADMIN_SUBMISSION_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("submission_files").select("id, submission_id, original_name, mime_type, size_bytes, created_at").eq("submission_id", id),
    supabase.from("evaluation_assignments").select("id, submission_id, faculty_id, due_at, created_at").eq("submission_id", id),
    supabase
      .from("evaluations")
      .select("id, submission_id, evaluator_id, recommendation, score, criteria_scores, private_remarks, status, submitted_at, reopened_at")
      .eq("submission_id", id),
    supabase.from("profiles").select("id, email, role, access_status, full_name, vid, onboarded_at").eq("role", "faculty").order("email"),
  ]);
  const sub = sData as (SubmissionRow & { eligibility_reason: string | null }) | null;
  if (!sub) notFound();

  const files = rowsOf<SubmissionFileRow>(fData);
  const assignments = rowsOf<AssignmentRow>(aData);
  const evaluations = rowsOf<EvaluationRow>(eData);
  const faculty = rowsOf<Profile>(facData);
  const facultyById = new Map(faculty.map((f) => [f.id, f]));
  const evalByFaculty = new Map(evaluations.map((e) => [e.evaluator_id, e]));
  const activeFaculty = faculty.filter((f) => f.access_status === "active" && !assignments.some((a) => a.faculty_id === f.id));

  const { data: studentData } = await supabase.from("profiles").select("email").eq("id", sub.student_id).maybeSingle();
  const studentEmail = (studentData as { email: string } | null)?.email ?? "";
  const warnings = conflictWarnings(
    { studentEmail, studentName: sub.student_name, teamMembers: sub.team_members },
    assignments.map((a) => facultyById.get(a.faculty_id)).filter((f): f is Profile => Boolean(f)),
  );
  const returnTo = `/admin/submissions/${id}`;

  return (
    <>
      <div>
        <Link href="/admin/submissions" className="small">
          ← All submissions
        </Link>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          {sub.title}
        </h1>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <SubmissionStatusBadge status={sub.status} />
          <span className="badge badge-neutral">{sub.reference_code}</span>
        </div>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />
      {warnings.map((w) => (
        <Notice key={w} kind="warn">
          Possible conflict of interest: {w}
        </Notice>
      ))}

      <div className="panel">
        <h2>Details</h2>
        <dl className="dl">
          <dt>Submission ID</dt>
          <dd>
            <code>{sub.id}</code>
          </dd>
          <dt>Student</dt>
          <dd>
            {sub.student_name} · {sub.student_vid} · {studentEmail}
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
          <dt>Public summary</dt>
          <dd>{sub.public_summary ?? "—"}</dd>
          {sub.eligibility_reason && (
            <>
              <dt>Eligibility note</dt>
              <dd>{sub.eligibility_reason}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="panel">
        <h2>Evidence</h2>
        <FileList files={files} />
      </div>

      <div className="panel">
        <h2>Reviewers &amp; evaluations</h2>
        {assignments.length === 0 ? (
          <p className="muted">No reviewers assigned. Status: Not assigned.</p>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col">Recommendation</th>
                  <th scope="col">Score</th>
                  <th scope="col">Private remarks</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const f = facultyById.get(a.faculty_id);
                  const e = evalByFaculty.get(a.faculty_id);
                  return (
                    <tr key={a.id}>
                      <td>
                        {f?.full_name ?? f?.email ?? "Unknown"}
                        {f?.access_status === "revoked" && <div className="badge badge-danger">Access revoked</div>}
                      </td>
                      <td>{fmtDateTime(a.due_at)}</td>
                      <td>
                        <EvaluationStatusBadge status={e ? e.status : "pending"} />
                        {e?.reopened_at && <div className="small muted">Reopened</div>}
                      </td>
                      <td>{e?.status === "submitted" ? (e.recommendation === "yes" ? "Yes" : "No") : "—"}</td>
                      <td>{e?.score ?? "—"}</td>
                      <td style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>{e?.private_remarks ?? "—"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {e?.status === "submitted" && (
                            <form action={reopenEvaluation} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <input type="hidden" name="evaluationId" value={e.id} />
                              <input type="hidden" name="submissionId" value={id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <label className="sr-only" htmlFor={`reason-${e.id}`}>
                                Reason for reopening
                              </label>
                              <input id={`reason-${e.id}`} name="reason" className="input" placeholder="Reason to reopen" required minLength={5} />
                              <SubmitButton size="sm" variant="ghost" confirmMessage="Reopen this final evaluation as a draft?">
                                Reopen
                              </SubmitButton>
                            </form>
                          )}
                          <form action={removeAssignment}>
                            <input type="hidden" name="assignmentId" value={a.id} />
                            <input type="hidden" name="submissionId" value={id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <SubmitButton size="sm" variant="danger" confirmMessage="Remove this reviewer from the submission?">
                              Remove
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={assignReviewers} className="form">
          <input type="hidden" name="submissionId" value={id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 16 }}>
            <legend className="label" style={{ padding: "0 6px" }}>
              Assign reviewers
            </legend>
            {activeFaculty.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No other active faculty available. <Link href="/admin/faculty">Invite faculty</Link>.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeFaculty.map((f) => (
                  <label key={f.id} className="check">
                    <input type="checkbox" name="facultyIds" value={f.id} /> {f.full_name ? `${f.full_name} (${f.email})` : f.email}
                  </label>
                ))}
                <div className="field" style={{ maxWidth: 280, marginTop: 8 }}>
                  <label htmlFor="dueAt">Evaluation deadline (optional)</label>
                  <input id="dueAt" name="dueAt" type="datetime-local" className="input" />
                </div>
                <div>
                  <SubmitButton>Assign selected</SubmitButton>
                </div>
              </div>
            )}
          </fieldset>
        </form>
      </div>

      <div className="panel">
        <h2>Eligibility decision</h2>
        <form action={setEligibility} className="form" style={{ maxWidth: 640 }}>
          <input type="hidden" name="submissionId" value={id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="field">
            <label htmlFor="reason">Reason / note (required for “not eligible”, recorded in the audit log)</label>
            <textarea id="reason" name="reason" className="textarea" maxLength={1000} style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SubmitButton name="decision" value="eligible">
              Mark eligible
            </SubmitButton>
            <SubmitButton name="decision" value="ineligible" variant="danger" confirmMessage="Mark this submission as not eligible?">
              Mark not eligible
            </SubmitButton>
            <SubmitButton name="decision" value="under_review" variant="ghost">
              Back to review
            </SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
