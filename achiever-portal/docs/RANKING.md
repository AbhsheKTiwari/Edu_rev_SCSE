# How winners are ranked

The ranking is **deterministic** (same data → same order every time) and **advisory**: the system suggests an order, the administrator decides, records a rationale, previews and publishes. Nothing is ever published automatically.

Code: `src/lib/ranking.ts` · Tests: `tests/ranking.test.ts` · Settings: Admin → Settings.

## 1. Who participates

- **Evaluations page:** submissions in the chosen date range with status *submitted, under review, eligible* or *published* (for monitoring).
- **Winners page:** only submissions the admin marked **eligible** (or already published) whose `submission_date` falls in the selected day/week.

## 2. Which evaluations count

| Evaluation state | Counted? |
|---|---|
| Submitted (final) | ✅ Yes |
| Draft | ❌ No — counted as **pending** |
| Assigned but not started | ❌ No — counted as **pending** |

Pending reviews are **never** treated as "No" votes. The admin sees "x done / y pending" for every submission.

## 3. Minimum requirement

A submission is rankable only with **at least N submitted evaluations** (Settings → *Minimum submitted evaluations*, default 2). For the *score* and *combined* methods at least one numeric score is also required. Others are listed under "Outstanding / not yet rankable" with the reason.

## 4. The metric (0–100)

| Method | Formula |
|---|---|
| Positive votes | `yes votes ÷ submitted evaluations × 100` |
| Average score | mean of numeric scores (0–100) from submitted evaluations |
| Combined (default) | `w × yes% + (1 − w) × average score`, `w` = vote weight (default 0.6) |

Metrics are rounded to 2 decimals before comparing.

## 5. Tie-breaking (applied in this order)

1. Higher metric
2. More "Yes" votes
3. Higher average score (no score ranks below any score)
4. Earlier submission time (`created_at`)
5. Submission ID, alphabetical (guarantees a unique order)

Submissions with the same metric are flagged **Tie** so the admin can make a conscious decision.

## 6. Publishing

1. Admin → Winners → choose *Daily* or *Weekly* and a date.
2. For a candidate: set **rank**, **public remark** (shown publicly, ≤ 280 chars) and **selection rationale** (private, required) → *Add as draft winner*.
3. Check the **public card preview**.
4. **Publish** → appears on the homepage for that day/week. **Unpublish** removes it. Only one *published* entry can hold a given rank per period (database constraint).
5. Every draft, publish, unpublish and delete is recorded in the audit log.
