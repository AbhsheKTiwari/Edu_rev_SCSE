import "server-only";
import { rankCandidates, type Candidate, type RankedResult, type RankingConfig } from "@/lib/ranking";
import { rowsOf, type AnyClient, type SubmissionRow } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";

export interface CandidateWithSubmission extends Candidate {
  submission: SubmissionRow;
}

export function configFrom(s: AppSettings): RankingConfig {
  return { method: s.ranking_method, minEvaluations: s.min_evaluations, voteWeight: Number(s.vote_weight) };
}

/** Loads submissions in a date range with their assignments and evaluations, then ranks them. */
export async function loadRanking(
  client: AnyClient,
  opts: { from: string; to: string; statuses: string[] },
  config: RankingConfig,
): Promise<{ ranked: RankedResult<CandidateWithSubmission>[]; notQualified: RankedResult<CandidateWithSubmission>[] }> {
  const { data: sData } = await client
    .from("submissions")
    .select("id, reference_code, student_id, student_vid, student_name, title, category, submission_date, status, created_at, team_members")
    .in("status", opts.statuses)
    .gte("submission_date", opts.from)
    .lte("submission_date", opts.to)
    .limit(1000);
  const subs = rowsOf<SubmissionRow>(sData);
  const ids = subs.map((s) => s.id);
  if (ids.length === 0) return { ranked: [], notQualified: [] };

  const [{ data: aData }, { data: eData }] = await Promise.all([
    client.from("evaluation_assignments").select("submission_id").in("submission_id", ids),
    client.from("evaluations").select("submission_id, status, recommendation, score").in("submission_id", ids),
  ]);
  const assigned = new Map<string, number>();
  rowsOf<{ submission_id: string }>(aData).forEach((a) => assigned.set(a.submission_id, (assigned.get(a.submission_id) ?? 0) + 1));
  const evals = new Map<string, Candidate["evaluations"]>();
  rowsOf<{ submission_id: string; status: "draft" | "submitted"; recommendation: "yes" | "no" | null; score: number | string | null }>(eData).forEach(
    (e) => {
      const list = evals.get(e.submission_id) ?? [];
      list.push({ status: e.status, recommendation: e.recommendation, score: e.score === null ? null : Number(e.score) });
      evals.set(e.submission_id, list);
    },
  );

  const candidates: CandidateWithSubmission[] = subs.map((s) => ({
    submissionId: s.id,
    createdAt: s.created_at,
    assignedCount: assigned.get(s.id) ?? 0,
    evaluations: evals.get(s.id) ?? [],
    submission: s,
  }));
  return rankCandidates(candidates, config);
}
