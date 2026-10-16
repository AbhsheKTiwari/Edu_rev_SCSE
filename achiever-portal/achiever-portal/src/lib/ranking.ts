/**
 * Deterministic ranking of eligible submissions. See docs/RANKING.md.
 *
 * 1. Only SUBMITTED evaluations count. Drafts and unstarted reviews are
 *    "pending" — never treated as a "No" vote.
 * 2. A candidate qualifies only with at least `minEvaluations` submitted reviews
 *    (and, for score-based methods, at least one numeric score).
 * 3. Metric (0–100, rounded to 2 decimals):
 *      votes    → % of submitted reviews recommending "Yes"
 *      score    → average numeric score
 *      combined → voteWeight × yes% + (1 − voteWeight) × average score
 * 4. Tie-breaks, in order: metric ↓, yes votes ↓, average score ↓,
 *    earlier submission time ↑, submission id ↑ (alphabetical).
 * 5. The result is only a SUGGESTION. The administrator approves and publishes.
 */

export type RankingMethod = "votes" | "score" | "combined";

export interface RankingConfig {
  method: RankingMethod;
  minEvaluations: number;
  voteWeight: number; // 0..1, used by "combined"
}

export interface EvaluationInput {
  status: "draft" | "submitted";
  recommendation: "yes" | "no" | null;
  score: number | null;
}

export interface Candidate {
  submissionId: string;
  createdAt: string; // ISO timestamp
  assignedCount: number;
  evaluations: EvaluationInput[];
}

export interface RankedResult<C extends Candidate> {
  candidate: C;
  submittedCount: number;
  pendingCount: number;
  yesVotes: number;
  noVotes: number;
  yesPercent: number;
  avgScore: number | null;
  metric: number;
  qualifies: boolean;
  reason: string | null;
  position: number | null;
  tiedWith: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function scoreCandidate<C extends Candidate>(c: C, config: RankingConfig): RankedResult<C> {
  const submitted = c.evaluations.filter((e) => e.status === "submitted");
  const yesVotes = submitted.filter((e) => e.recommendation === "yes").length;
  const noVotes = submitted.filter((e) => e.recommendation === "no").length;
  const scores = submitted.map((e) => e.score).filter((s): s is number => typeof s === "number");
  const avgScore = scores.length ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const submittedCount = submitted.length;
  const pendingCount = Math.max(0, Math.max(c.assignedCount, c.evaluations.length) - submittedCount);
  const yesPercent = submittedCount ? round2((yesVotes / submittedCount) * 100) : 0;

  let qualifies = submittedCount >= config.minEvaluations;
  let reason: string | null = qualifies
    ? null
    : `Needs ${config.minEvaluations} submitted evaluation(s); has ${submittedCount}.`;

  if (qualifies && config.method !== "votes" && avgScore === null) {
    qualifies = false;
    reason = "No numeric scores yet, required by the selected ranking method.";
  }

  let metric = 0;
  if (config.method === "votes") metric = yesPercent;
  else if (config.method === "score") metric = avgScore ?? 0;
  else metric = config.voteWeight * yesPercent + (1 - config.voteWeight) * (avgScore ?? 0);

  return {
    candidate: c,
    submittedCount,
    pendingCount,
    yesVotes,
    noVotes,
    yesPercent,
    avgScore,
    metric: round2(metric),
    qualifies,
    reason,
    position: null,
    tiedWith: [],
  };
}

export function compareResults<C extends Candidate>(a: RankedResult<C>, b: RankedResult<C>): number {
  if (b.metric !== a.metric) return b.metric - a.metric;
  if (b.yesVotes !== a.yesVotes) return b.yesVotes - a.yesVotes;
  const as = a.avgScore ?? -1;
  const bs = b.avgScore ?? -1;
  if (bs !== as) return bs - as;
  const at = Date.parse(a.candidate.createdAt);
  const bt = Date.parse(b.candidate.createdAt);
  if (at !== bt) return at - bt;
  return a.candidate.submissionId < b.candidate.submissionId ? -1 : a.candidate.submissionId > b.candidate.submissionId ? 1 : 0;
}

export function rankCandidates<C extends Candidate>(
  candidates: readonly C[],
  config: RankingConfig,
): { ranked: RankedResult<C>[]; notQualified: RankedResult<C>[] } {
  const scored = candidates.map((c) => scoreCandidate(c, config));
  const ranked = scored.filter((r) => r.qualifies).sort(compareResults);
  const notQualified = scored.filter((r) => !r.qualifies);

  ranked.forEach((r, i) => {
    r.position = i + 1;
    r.tiedWith = ranked
      .filter((o) => o !== r && o.metric === r.metric)
      .map((o) => o.candidate.submissionId);
  });

  return { ranked, notQualified };
}
