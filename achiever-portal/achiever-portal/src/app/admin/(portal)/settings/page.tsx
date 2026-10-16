import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { updateSettings } from "@/lib/actions/admin";
import { FlashFromParams } from "@/components/ui/status";
import { SubmitButton } from "@/components/ui/submit-button";
import { firstParam, type SearchParams } from "@/lib/types";
import { isoToZonedLocal } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

function toLocalInput(iso: string | null): string {
  return iso ? isoToZonedLocal(iso, appTimeZone()) : "";
}

export default async function AdminSettings({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const s = await loadSettings(supabase);

  return (
    <>
      <div>
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Settings</h1>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />
      <form action={updateSettings} className="form" style={{ maxWidth: 760 }}>
        <div className="panel form">
          <h2 style={{ margin: 0 }}>Submissions</h2>
          <label className="check">
            <input type="checkbox" name="submissionsOpen" defaultChecked={s.submissions_open} /> Accept new submissions
          </label>
          <div className="form-row">
            <div className="field">
              <label htmlFor="submissionDeadline">Submission deadline (optional)</label>
              <input id="submissionDeadline" name="submissionDeadline" type="datetime-local" className="input" defaultValue={toLocalInput(s.submission_deadline)} />
              <span className="hint">Time zone: {appTimeZone()}. After this moment, new submissions are refused (also enforced in the database).</span>
            </div>
            <div className="field">
              <label htmlFor="maxSubmissionsPerDay">Max submissions per student per day</label>
              <input
                id="maxSubmissionsPerDay"
                name="maxSubmissionsPerDay"
                type="number"
                min={1}
                max={50}
                className="input"
                defaultValue={s.max_submissions_per_day ?? ""}
              />
              <span className="hint">Leave empty for no limit. A student can never submit the same title twice on the same date.</span>
            </div>
          </div>
        </div>

        <div className="panel form">
          <h2 style={{ margin: 0 }}>Ranking rule</h2>
          <div className="form-row">
            <div className="field">
              <label htmlFor="rankingMethod">Winner determined by</label>
              <select id="rankingMethod" name="rankingMethod" className="select" defaultValue={s.ranking_method}>
                <option value="votes">Positive votes (% Yes)</option>
                <option value="score">Average score</option>
                <option value="combined">Combination of votes and score</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="voteWeight">Vote weight for “combined” (0–1)</label>
              <input id="voteWeight" name="voteWeight" type="number" min={0} max={1} step="0.05" className="input" defaultValue={s.vote_weight} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="minEvaluations">Minimum submitted evaluations to be ranked</label>
              <input id="minEvaluations" name="minEvaluations" type="number" min={1} max={20} className="input" defaultValue={s.min_evaluations} />
            </div>
            <label className="check" style={{ alignSelf: "end" }}>
              <input type="checkbox" name="rubricEnabled" defaultChecked={s.rubric_enabled} /> Show rubric criteria on the evaluation form
            </label>
          </div>
        </div>
        <div>
          <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        </div>
      </form>
    </>
  );
}
