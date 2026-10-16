import type { SupabaseClient } from "@supabase/supabase-js";

/** Any Supabase client (session or service role). The schema is untyped; rows are cast at the edges. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClient = SupabaseClient<any, any, any>;

export const CATEGORIES =["Research", "Placement", "Revenue Generation", "Project", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Role = "student" | "faculty" | "admin";
export type PeriodType = "day" | "week";

export const SUBMISSION_STATUSES = [
  "submitted",
  "under_review",
  "eligible",
  "ineligible",
  "published",
  "withdrawn",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface Profile {
  id: string;
  email: string;
  role: Role;
  access_status: "active" | "revoked";
  full_name: string | null;
  vid: string | null;
  onboarded_at: string | null;
}

export interface SubmissionRow {
  id: string;
  reference_code: string;
  student_id: string;
  student_vid: string;
  student_name: string;
  title: string;
  description: string;
  category: Category;
  team_members: string[];
  submission_date: string;
  public_summary: string | null;
  project_url: string | null;
  status: SubmissionStatus;
  eligibility_reason: string | null;
  created_at: string;
}

export interface SubmissionFileRow {
  id: string;
  submission_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface EvaluationRow {
  id: string;
  submission_id: string;
  evaluator_id: string;
  recommendation: "yes" | "no" | null;
  score: number | null;
  criteria_scores: Record<string, number>;
  private_remarks: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  reopened_at: string | null;
}

export interface AssignmentRow {
  id: string;
  submission_id: string;
  faculty_id: string;
  due_at: string | null;
  created_at: string;
}

/** What the public site is allowed to know about an achiever. */
export interface PublicAchiever {
  id: string;
  rank: number;
  displayName: string;
  initials: string;
  title: string;
  category: Category;
  publicRemark: string | null;
  periodType: PeriodType;
  periodStart: string;
  isDemo: boolean;
}

export function rowsOf<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : []) as T[];
}

export function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
