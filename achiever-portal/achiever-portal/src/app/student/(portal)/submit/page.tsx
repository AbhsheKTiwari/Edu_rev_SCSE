import type { Metadata } from "next";
import { requireOnboardedStudent } from "@/lib/auth";
import { loadSettings, submissionsAreOpen } from "@/lib/settings";
import { todayISO } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";
import { Notice } from "@/components/ui/status";
import { SubmissionForm } from "./submission-form";

export const metadata: Metadata = { title: "Submit a project" };

export default async function SubmitPage() {
  const { supabase, profile } = await requireOnboardedStudent();
  const settings = await loadSettings(supabase);
  const open = submissionsAreOpen(settings);

  return (
    <>
      <div>
        <span className="eyebrow">New submission</span>
        <h1 className="page-title">Submit a project</h1>
      </div>
      {settings.submission_deadline && open && (
        <Notice kind="info">
          Submissions close on {new Date(settings.submission_deadline).toLocaleString("en-IN", { timeZone: appTimeZone() })}.
        </Notice>
      )}
      {!open ? (
        <Notice kind="warn">Submissions are currently closed. Please check back later.</Notice>
      ) : (
        <div className="panel" style={{ maxWidth: 820 }}>
          <SubmissionForm
            studentName={profile.full_name ?? ""}
            studentVid={profile.vid ?? ""}
            today={todayISO(appTimeZone())}
            maxUploadMb={settings.max_upload_mb}
          />
        </div>
      )}
    </>
  );
}
