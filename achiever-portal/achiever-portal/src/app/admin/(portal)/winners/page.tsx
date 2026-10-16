import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSettings } from "@/lib/settings";
import { configFrom, loadRanking } from "@/lib/ranking-data";
import { addDays, formatLong, formatWeekRange, isValidISODate, todayISO, weekStart } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";
import { createAchievement, setAchievementStatus } from "@/lib/actions/admin";
import { Podium } from "@/components/achievers/podium";
import { EmptyState, FlashFromParams, Notice } from "@/components/ui/status";
import { SubmitButton } from "@/components/ui/submit-button";
import { arrangePodium } from "@/lib/podium";
import { firstParam, rowsOf, type Category, type PublicAchiever, type SearchParams } from "@/lib/types";

export const metadata: Metadata = { title: "Winners & publishing" };

interface AchievementRow {
  id: string;
  submission_id: string | null;
  rank: number;
  display_name: string;
  initials: string;
  achievement_title: string;
  category: Category;
  public_remark: string | null;
  selection_rationale: string | null;
  status: "draft" | "published" | "unpublished";
  period_type: "day" | "week";
  period_start: string;
  published_at: string | null;
  is_demo: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default async function AdminWinners({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("admin");
  const admin = createAdminClient();
  const today = todayISO(appTimeZone());

  const periodType = firstParam(sp.period) === "week" ? "week" : "day";
  const rawDate = firstParam(sp.date);
  const date = isValidISODate(rawDate) && rawDate <= today ? rawDate : today;
  const periodStart = periodType === "week" ? weekStart(date) : date;
  const periodEnd = periodType === "week" ? addDays(periodStart, 6) : periodStart;
  const label = periodType === "week" ? `Week of ${formatWeekRange(periodStart)}` : formatLong(periodStart);
  const returnTo = `/admin/winners?period=${periodType}&date=${periodStart}`;

  const settings = await loadSettings(supabase);
  const [{ ranked }, { data: achData }, { data: auditData }] = await Promise.all([
    loadRanking(supabase, { from: periodStart, to: periodEnd, statuses: ["eligible", "published"] }, configFrom(settings)),
    admin
      .from("achievements")
      .select("id, submission_id, rank, display_name, initials, achievement_title, category, public_remark, selection_rationale, status, period_type, period_start, published_at, is_demo")
      .eq("period_type", periodType)
      .eq("period_start", periodStart)
      .eq("is_demo", false)
      .order("rank"),
    admin
      .from("audit_logs")
      .select("id, action, entity_id, details, created_at")
      .like("action", "achievement.%")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const entries = rowsOf<AchievementRow>(achData);
  const audit = rowsOf<AuditRow>(auditData);
  const takenSubmissions = new Set(entries.map((e) => e.submission_id));
  const nextRank = (entries.reduce((m, e) => Math.max(m, e.rank), 0) || 0) + 1;

  const toPublic = (e: AchievementRow): PublicAchiever => ({
    id: e.id,
    rank: e.rank,
    displayName: e.display_name,
    initials: e.initials,
    title: e.achievement_title,
    category: e.category,
    publicRemark: e.public_remark,
    periodType: e.period_type,
    periodStart: e.period_start,
    isDemo: false,
  });
  const previewItems = entries.filter((e) => e.status !== "unpublished").map(toPublic);
  const preview = arrangePodium(previewItems);

  return (
    <>
      <div>
        <span className="eyebrow">Administrator</span>
        <h1 className="page-title">Winners &amp; publishing</h1>
      </div>
      <FlashFromParams notice={firstParam(sp.notice)} error={firstParam(sp.error)} />
      <Notice kind="info">
        Winners are never published automatically. Select eligible submissions, record your rationale, preview, then publish. Every change is
        written to the audit log.
      </Notice>

      <form className="filters panel">
        <div className="field">
          <label htmlFor="period">Period</label>
          <select id="period" name="period" className="select" defaultValue={periodType}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="date">Date (any day in the week for weekly)</label>
          <input id="date" name="date" type="date" className="input" max={today} defaultValue={periodStart} />
        </div>
        <button className="btn btn-primary" type="submit">
          Show period
        </button>
      </form>

      <div className="panel">
        <h2>Entries for {label}</h2>
        {entries.length === 0 ? (
          <p className="muted">No winners selected for this period yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Student · achievement</th>
                  <th scope="col">Public remark</th>
                  <th scope="col">Rationale (private)</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.rank}</td>
                    <td>
                      {e.display_name}
                      <div className="small muted">{e.achievement_title}</div>
                    </td>
                    <td>{e.public_remark ?? "—"}</td>
                    <td style={{ maxWidth: 260 }}>{e.selection_rationale ?? "—"}</td>
                    <td>
                      <span className={`badge ${e.status === "published" ? "badge-ok" : e.status === "draft" ? "badge-info" : "badge-neutral"}`}>{e.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {e.status !== "published" ? (
                          <form action={setAchievementStatus}>
                            <input type="hidden" name="achievementId" value={e.id} />
                            <input type="hidden" name="action" value="publish" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <SubmitButton size="sm" confirmMessage={`Publish ${e.display_name} as rank ${e.rank} on the public homepage?`}>
                              Publish
                            </SubmitButton>
                          </form>
                        ) : (
                          <form action={setAchievementStatus}>
                            <input type="hidden" name="achievementId" value={e.id} />
                            <input type="hidden" name="action" value="unpublish" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <SubmitButton size="sm" variant="danger" confirmMessage="Remove this achievement from the public homepage?">
                              Unpublish
                            </SubmitButton>
                          </form>
                        )}
                        {e.status !== "published" && (
                          <form action={setAchievementStatus}>
                            <input type="hidden" name="achievementId" value={e.id} />
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <SubmitButton size="sm" variant="ghost" confirmMessage="Delete this entry? This cannot be undone.">
                              Delete
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewItems.length > 0 && (
        <div className="panel">
          <h2>Public card preview (drafts + published)</h2>
          <Podium items={preview.podium} />
          {preview.rest.length > 0 && <p className="small muted">+ {preview.rest.length} more shown in the “Also recognised” gallery.</p>}
        </div>
      )}

      <div className="panel">
        <h2>Eligible candidates in this period</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Ranked by the configured rule. Only submissions marked <strong>eligible</strong> with enough completed evaluations appear.{" "}
          <Link href="/admin/evaluations">See all evaluations</Link>.
        </p>
        {ranked.length === 0 ? (
          <EmptyState title="No eligible, fully-reviewed submissions in this period" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ranked.map((r, i) => {
              const s = r.candidate.submission;
              const taken = takenSubmissions.has(s.id);
              return (
                <form key={s.id} action={createAchievement} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <input type="hidden" name="submissionId" value={s.id} />
                  <input type="hidden" name="periodType" value={periodType} />
                  <input type="hidden" name="periodStart" value={periodStart} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong>
                        #{r.position} · {s.title}
                      </strong>
                      <div className="small muted">
                        {s.student_name} · {s.category} · metric {r.metric} · {r.yesVotes} yes / {r.noVotes} no · avg {r.avgScore ?? "—"}
                        {r.tiedWith.length > 0 && " · TIED"}
                      </div>
                    </div>
                    {taken && <span className="badge badge-ok">Already selected</span>}
                  </div>
                  {!taken && (
                    <>
                      <div className="form-row">
                        <div className="field">
                          <label htmlFor={`rank-${s.id}`}>Rank</label>
                          <input id={`rank-${s.id}`} name="rank" type="number" min={1} max={100} defaultValue={nextRank + i} className="input" required />
                        </div>
                        <div className="field">
                          <label htmlFor={`remark-${s.id}`}>Public remark (max 280)</label>
                          <input id={`remark-${s.id}`} name="publicRemark" className="input" maxLength={280} defaultValue={s.public_summary ?? ""} />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor={`rationale-${s.id}`}>Selection rationale (private, required)</label>
                        <textarea id={`rationale-${s.id}`} name="rationale" className="textarea" required minLength={10} maxLength={2000} style={{ minHeight: 70 }} />
                      </div>
                      <div>
                        <SubmitButton size="sm">Add as draft winner</SubmitButton>
                      </div>
                    </>
                  )}
                </form>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Publication history</h2>
        {audit.length === 0 ? (
          <p className="muted">No publication activity yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {audit.map((a) => (
              <li key={a.id}>
                <span className="small muted">{fmtDateTime(a.created_at)}</span> — <code>{a.action}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
