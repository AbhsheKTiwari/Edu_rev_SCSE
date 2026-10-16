import { describe, expect, it } from "vitest";
import { rankCandidates, type Candidate, type EvaluationInput, type RankingConfig } from "@/lib/ranking";

const yes = (score: number | null = null): EvaluationInput => ({ status: "submitted", recommendation: "yes", score });
const no = (score: number | null = null): EvaluationInput => ({ status: "submitted", recommendation: "no", score });
const draft = (): EvaluationInput => ({ status: "draft", recommendation: null, score: null });

const cand = (id: string, evaluations: EvaluationInput[], createdAt = "2026-10-10T10:00:00Z", assignedCount = evaluations.length): Candidate => ({
  submissionId: id,
  createdAt,
  assignedCount,
  evaluations,
});

const votes: RankingConfig = { method: "votes", minEvaluations: 2, voteWeight: 0.6 };

describe("ranking", () => {
  it("ranks by % yes votes", () => {
    const { ranked } = rankCandidates([cand("a", [yes(), no()]), cand("b", [yes(), yes()])], votes);
    expect(ranked.map((r) => r.candidate.submissionId)).toEqual(["b", "a"]);
    expect(ranked[0].metric).toBe(100);
    expect(ranked[1].metric).toBe(50);
  });

  it("does NOT treat pending/draft reviews as 'No' votes", () => {
    const { ranked, notQualified } = rankCandidates([cand("a", [yes(), yes(), draft()], undefined, 4)], votes);
    expect(ranked[0].yesPercent).toBe(100); // 2 submitted, both yes
    expect(ranked[0].noVotes).toBe(0);
    expect(ranked[0].pendingCount).toBe(2); // 1 draft + 1 not started
    expect(notQualified).toHaveLength(0);
  });

  it("requires the minimum number of submitted evaluations", () => {
    const { ranked, notQualified } = rankCandidates([cand("a", [yes(), draft()], undefined, 2)], votes);
    expect(ranked).toHaveLength(0);
    expect(notQualified[0].reason).toMatch(/Needs 2/);
  });

  it("score method requires at least one numeric score", () => {
    const cfg: RankingConfig = { method: "score", minEvaluations: 1, voteWeight: 0 };
    const { ranked, notQualified } = rankCandidates([cand("a", [yes(80)]), cand("b", [yes()])], cfg);
    expect(ranked.map((r) => r.candidate.submissionId)).toEqual(["a"]);
    expect(notQualified[0].candidate.submissionId).toBe("b");
  });

  it("combined method weights votes and score", () => {
    const cfg: RankingConfig = { method: "combined", minEvaluations: 2, voteWeight: 0.5 };
    // a: 50% yes, avg 90 → 70 ; b: 100% yes, avg 30 → 65
    const { ranked } = rankCandidates([cand("a", [yes(90), no(90)]), cand("b", [yes(30), yes(30)])], cfg);
    expect(ranked.map((r) => [r.candidate.submissionId, r.metric])).toEqual([
      ["a", 70],
      ["b", 65],
    ]);
  });

  it("tie-break: yes votes, then avg score, then earlier submission, then id", () => {
    const cfg: RankingConfig = { method: "votes", minEvaluations: 1, voteWeight: 0 };
    const { ranked } = rankCandidates(
      [
        cand("d", [yes(50)], "2026-10-10T09:00:00Z"),
        cand("c", [yes(50)], "2026-10-10T08:00:00Z"), // earlier than d
        cand("b", [yes(70)], "2026-10-10T12:00:00Z"), // higher score
        cand("a", [yes(50), yes(50)], "2026-10-10T23:00:00Z"), // more yes votes
        cand("e", [yes(50)], "2026-10-10T08:00:00Z"), // same time as c → id order
      ],
      cfg,
    );
    expect(ranked.map((r) => r.candidate.submissionId)).toEqual(["a", "b", "c", "e", "d"]);
    expect(ranked.every((r) => r.tiedWith.length === 4)).toBe(true); // all at 100% → flagged as tied for admin review
  });

  it("is deterministic regardless of input order", () => {
    const list = [cand("x", [yes(60), no(60)]), cand("y", [yes(60), no(60)]), cand("z", [yes(), yes()])];
    const a = rankCandidates(list, votes).ranked.map((r) => r.candidate.submissionId);
    const b = rankCandidates([...list].reverse(), votes).ranked.map((r) => r.candidate.submissionId);
    expect(a).toEqual(b);
  });
});
