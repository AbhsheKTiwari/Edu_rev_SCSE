import "server-only";
import { CATEGORIES, SUBMISSION_STATUSES, type AnyClient } from "@/lib/types";
import { isValidISODate } from "@/lib/dates";

export interface SubmissionFilters {
  q: string;
  category: string;
  status: string;
  from: string;
  to: string;
}

export function readFilters(get: (k: string) => string): SubmissionFilters {
  const category = get("category");
  const status = get("status");
  const from = get("from");
  const to = get("to");
  return {
    q: get("q").trim().slice(0, 80),
    category: (CATEGORIES as readonly string[]).includes(category) ? category : "",
    status: (SUBMISSION_STATUSES as readonly string[]).includes(status) ? status : "",
    from: isValidISODate(from) ? from : "",
    to: isValidISODate(to) ? to : "",
  };
}

export const ADMIN_SUBMISSION_COLUMNS =
  "id, reference_code, student_id, student_vid, student_name, title, description, category, team_members, submission_date, public_summary, project_url, status, eligibility_reason, created_at";

/** Search by VID, student name, title or submission reference/ID; filter by category, status and date. */
export function buildSubmissionQuery(client: AnyClient, f: SubmissionFilters, opts: { count?: boolean } = {}) {
  let query = client
    .from("submissions")
    .select(ADMIN_SUBMISSION_COLUMNS, opts.count ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false });
  if (f.category) query = query.eq("category", f.category);
  if (f.status) query = query.eq("status", f.status);
  if (f.from) query = query.gte("submission_date", f.from);
  if (f.to) query = query.lte("submission_date", f.to);
  if (f.q) {
    if (/^[0-9a-f-]{36}$/i.test(f.q)) {
      query = query.eq("id", f.q);
    } else {
      const safe = f.q.replace(/[%,()*\\]/g, " ").trim();
      if (safe) {
        query = query.or(
          `student_vid.ilike.%${safe}%,student_name.ilike.%${safe}%,title.ilike.%${safe}%,reference_code.ilike.%${safe}%`,
        );
      }
    }
  }
  return query;
}
