import "server-only";
import type { RankingMethod } from "@/lib/ranking";
import type { AnyClient } from "@/lib/types";

export interface AppSettings {
  submissions_open: boolean;
  submission_deadline: string | null;
  max_submissions_per_day: number | null;
  ranking_method: RankingMethod;
  vote_weight: number;
  min_evaluations: number;
  rubric_enabled: boolean;
  max_upload_mb: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  submissions_open: true,
  submission_deadline: null,
  max_submissions_per_day: null,
  ranking_method: "combined",
  vote_weight: 0.6,
  min_evaluations: 2,
  rubric_enabled: true,
  max_upload_mb: 10,
};

// Accepts any Supabase client (user session or admin).
export async function loadSettings(client: AnyClient): Promise<AppSettings> {
  const { data } = await client
    .from("app_settings")
    .select(
      "submissions_open, submission_deadline, max_submissions_per_day, ranking_method, vote_weight, min_evaluations, rubric_enabled, max_upload_mb",
    )
    .eq("id", true)
    .maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  const s = data as AppSettings;
  return { ...s, vote_weight: Number(s.vote_weight) };
}

export function submissionsAreOpen(s: AppSettings, now = new Date()): boolean {
  if (!s.submissions_open) return false;
  if (s.submission_deadline && now.getTime() > Date.parse(s.submission_deadline)) return false;
  return true;
}
