import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedStudent } from "@/lib/auth";
import { Notice, SubmissionStatusBadge } from "@/components/ui/status";
import { FileList } from "@/components/file-list";
import { firstParam, rowsOf, type SearchParams, type SubmissionFileRow, type SubmissionRow } from "@/lib/types";
import { MAX_FILES_PER_SUBMISSION } from "@/lib/files";
import { loadSettings } from "@/lib/settings";
import { AddEvidence } from "./add-evidence";

export const metadata: Metadata = { title: "Submission details" };

type Params = Promise<{ id: string }>;
const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function StudentSubmissionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireOnboardedStudent();

  // RLS returns the row only if it belongs to this student; we double-check ownership anyway.
  const { data } = await supabase
    .from("submissions")
    .select("id, reference_code, student_id, student_vid, student_name, title, description, category, team_members, submission_date, public_summary, project_url, status, created_at")
    .eq("id", id)
    .maybeSingle();
  const sub = data as SubmissionRow | null;
  if (!sub || sub.student_id !== user.id) notFound();

  const { data: fileData } = await supabase
    .from("submission_files")
    .select("id, submission_id, original_name, mime_type, size_bytes, created_at")
    .eq("submission_id", id)
    .order("created_at");
  const files = rowsOf<SubmissionFileRow>(fileData);
  const settings = await loadSettings(supabase);

  const created = firstParam(sp.created) === "1";
  const failed = Number(firstParam(sp.failed)) || 0;

  return (
    <>
      <div>
        <Link href="/student/dashboard" className="small">
          ← My submissions
        </Link>
        <h1 className="page-title" style={{ marginTop: 8 }}>
          {sub.title}
        </h1>
      </div>

      {created && failed === 0 && (
        <Notice kind="ok">
          Submission received. Your reference is <strong>{sub.reference_code}</strong>. You can follow its status here.
        </Notice>
      )}
      {created && failed > 0 && (
        <Notice kind="warn">
          Your submission <strong>{sub.reference_code}</strong> was saved, but {failed} file(s) could not be uploaded. Use “Add evidence” below
          to retry.
        </Notice>
      )}

      <div className="panel">
        <dl className="dl">
          <dt>Reference</dt>
          <dd>{sub.reference_code}</dd>
          <dt>Status</dt>
          <dd>
            <SubmissionStatusBadge status={sub.status} />
          </dd>
          <dt>Student</dt>
          <dd>
            {sub.student_name} · {sub.student_vid}
          </dd>
          <dt>Category</dt>
          <dd>{sub.category}</dd>
          <dt>Submission date</dt>
          <dd>{sub.submission_date}</dd>
          <dt>Team members</dt>
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
        </dl>
      </div>

      <div className="panel">
        <h2>Evidence</h2>
        <FileList files={files} />
        {(sub.status === "submitted" || sub.status === "under_review") && files.length < MAX_FILES_PER_SUBMISSION && (
          <AddEvidence submissionId={sub.id} maxUploadMb={settings.max_upload_mb} remaining={MAX_FILES_PER_SUBMISSION - files.length} />
        )}
      </div>

      <p className="small muted">Faculty remarks are confidential and are not shown to students.</p>
    </>
  );
}
