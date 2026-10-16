import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { configFrom, loadRanking } from "@/lib/ranking-data";
import { addDays, isValidISODate, todayISO } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";
import { EmptyState, Notice } from "@/components/ui/status";
import { firstParam, type SearchParams } from "@/lib/types";

export const metadata: Metadata = { title: "Evaluations & ranking" };

const METHOD_LABEL = { votes: "Positive votes (% Yes)", score: "Average score", combined: "Combined (votes + score)" } as const;

export default async function AdminEvaluations({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const today = todayISO(appTimeZone());
  const from = isValidISODate(firstParam(sp.from)) ? firstParam(sp.from) : addDays(today, -6);
  const to = isValidISODate(firstParam(sp.to)) ? firstParam(sp.to) : today;

  const settings = await loadSettings(supabase);
  const config = configFrom(settings);
  const { ranked, notQualified } = await loadRanking(supabase, { from, to, statuses: ["submitted", "under_review", "eligible", "published"] }, config);
  const hasTies = ranked.some((r) => r.tiedWith.length > 0);

  return (
    <>
      <div>
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Evaluations &amp; ranking</h1>
      </div>

      <form className="filters panel">
        <div className="field">
          <label htmlFor="from">Submissions from</label>
          <input id="from" name="from" type="date" className="input" defaultValue={from} />
        </div>
        <div className="field">
          <label htmlFor="to">to</label>
          <input id="to" name="to" type="date" className="input" defaultValue={to} />
        </div>
        <button className="btn btn-primary" type="submit">
          Update
        </button>
      </form>

      <Notice kind="info">
        Method: <strong>{METHOD_LABEL[config.method]}</strong>
        {config.method === "combined" && ` (${Math.round(config.voteWeight * 100)}% votes / ${Math.round((1 - config.voteWeight) * 100)}% score)`} · Minimum{" "}
        {config.minEvaluations} submitted evaluation(s). Pending reviews are never counted as “No”. Tie-breaks: yes votes → average score →
        earlier submission → submission ID. <Link href="/admin/settings">Change settings</Link> · see docs/RANKING.md
      </Notice>
      {hasTies && <Notice kind="warn">Some submissions are tied on the main metric. Review the tie-break order before publishing.</Notice>}

      <div className="panel">
        <h2>Suggested ranking ({ranked.length})</h2>
        {ranked.length === 0 ? (
          <EmptyState title="No submissions have enough completed evaluations yet" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Submission</th>
                  <th scope="col">Yes / No</th>
                  <th scope="col">Avg score</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Reviews</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.candidate.submissionId}>
                    <td>
                      {r.position}
                      {r.tiedWith.length > 0 && <div className="badge badge-warn">Tie</div>}
                    </td>
                    <td>
                      <Link href={`/admin/submissions/${r.candidate.submissionId}`}>{r.candidate.submission.title}</Link>
                      <div className="small muted">
                        {r.candidate.submission.student_name} · {r.candidate.submission.category}
                      </div>
                    </td>
                    <td>
                      {r.yesVotes} / {r.noVotes}
                    </td>
                    <td>{r.avgScore ?? "—"}</td>
                    <td>
                      <strong>{r.metric}</strong>
                    </td>
                    <td>
                      {r.submittedCount} done{r.pendingCount > 0 && <div className="small muted">{r.pendingCount} pending</div>}
                    </td>
                    <td>{r.candidate.submission.status.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Outstanding / not yet rankable ({notQualified.length})</h2>
        {notQualified.length === 0 ? (
          <p className="muted">Nothing outstanding in this range.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Submission</th>
                  <th scope="col">Assigned</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Pending</th>
                  <th scope="col">Why not ranked</th>
                </tr>
              </thead>
              <tbody>
                {notQualified.map((r) => (
                  <tr key={r.candidate.submissionId}>
                    <td>
                      <Link href={`/admin/submissions/${r.candidate.submissionId}`}>{r.candidate.submission.title}</Link>
                      <div className="small muted">{r.candidate.submission.reference_code}</div>
                    </td>
                    <td>{r.candidate.assignedCount === 0 ? <span className="badge badge-danger">Not assigned</span> : r.candidate.assignedCount}</td>
                    <td>{r.submittedCount}</td>
                    <td>{r.pendingCount}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
