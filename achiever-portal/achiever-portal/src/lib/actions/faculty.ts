"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, requireRole } from "@/lib/auth";
import { hashInviteCode, normalizeInviteCode, REDEEM_MESSAGES } from "@/lib/invitations";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { evaluationSchema, fieldErrors } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export interface RedeemState {
  ok: boolean;
  message: string | null;
}

/** Redeem a faculty invitation. Requires a verified email session. The DB function is atomic. */
export async function redeemInvite(_prev: RedeemState, formData: FormData): Promise<RedeemState> {
  const { supabase, user } = await getSession();
  if (!supabase || !user) return { ok: false, message: REDEEM_MESSAGES.not_authenticated };

  const raw = String(formData.get("code") ?? "");
  const code = normalizeInviteCode(raw);
  if (code.length < 16 || code.length > 40) return { ok: false, message: REDEEM_MESSAGES.invalid };

  const ip = await clientIp();
  if (!(await rateLimit(`redeem:user:${user.id}`, 5, 60 * 60)) || !(await rateLimit(`redeem:ip:${ip}`, 20, 60 * 60))) {
    return { ok: false, message: "Too many attempts. Please wait an hour and try again." };
  }

  const secret = process.env.INVITE_CODE_SECRET ?? "";
  let hash: string;
  try {
    hash = hashInviteCode(code, secret);
  } catch {
    console.error("[invite] INVITE_CODE_SECRET missing or too short");
    return { ok: false, message: "Invitations are not configured. Contact the administrator." };
  }

  const { data, error } = await supabase.rpc("redeem_faculty_invitation", { p_code_hash: hash });
  if (error) {
    console.error("[invite] rpc", error.message);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  const result = String(data);
  if (result !== "ok") return { ok: false, message: REDEEM_MESSAGES[result] ?? REDEEM_MESSAGES.invalid };

  revalidatePath("/", "layout");
  redirect("/faculty/dashboard?notice=Invitation+accepted.+Welcome!");
}

export interface EvalState {
  ok: boolean;
  message: string | null;
  errors: Record<string, string>;
}

/** Save a draft or submit a final evaluation. Authorization is checked here AND by RLS + triggers. */
export async function saveEvaluation(_prev: EvalState, formData: FormData): Promise<EvalState> {
  const { supabase, user } = await requireRole("faculty");
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return { ok: false, message: "Invalid submission.", errors: {} };

  const { data: assignment } = await supabase
    .from("evaluation_assignments")
    .select("id")
    .eq("submission_id", submissionId)
    .eq("faculty_id", user.id)
    .maybeSingle();
  if (!assignment) return { ok: false, message: "You are not assigned to evaluate this submission.", errors: {} };

  const parsed = evaluationSchema.safeParse({
    intent: formData.get("intent"),
    recommendation: formData.get("recommendation") ?? undefined,
    score: formData.get("score") ?? undefined,
    originality: formData.get("originality") ?? undefined,
    impact: formData.get("impact") ?? undefined,
    execution: formData.get("execution") ?? undefined,
    evidence: formData.get("evidence") ?? undefined,
    privateRemarks: formData.get("privateRemarks") ?? "",
    confirmFinal: formData.get("confirmFinal") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const criteria: Record<string, number> = {};
  for (const k of ["originality", "impact", "execution", "evidence"] as const) {
    if (v[k] !== null) criteria[k] = v[k] as number;
  }

  const row = {
    submission_id: submissionId,
    evaluator_id: user.id, // from the session, never from the form
    recommendation: v.recommendation ?? null,
    score: v.score,
    criteria_scores: criteria,
    private_remarks: v.privateRemarks,
    status: v.intent === "submit" ? "submitted" : "draft",
  };

  const { data: existing } = await supabase
    .from("evaluations")
    .select("id, status")
    .eq("submission_id", submissionId)
    .eq("evaluator_id", user.id)
    .maybeSingle();

  let error: { message: string; code?: string } | null = null;
  if (existing) {
    if ((existing as { status: string }).status === "submitted") {
      return { ok: false, message: "This evaluation is already final. Ask the administrator to reopen it if a change is needed.", errors: {} };
    }
    ({ error } = await supabase.from("evaluations").update(row).eq("id", (existing as { id: string }).id));
  } else {
    ({ error } = await supabase.from("evaluations").insert(row));
  }

  if (error) {
    if (error.code === "23505") return { ok: false, message: "You have already evaluated this submission.", errors: {} };
    console.error("[evaluation]", error.message);
    return { ok: false, message: "Could not save the evaluation. Please try again.", errors: {} };
  }

  await logAudit(user.id, v.intent === "submit" ? "evaluation.submitted" : "evaluation.draft_saved", "submission", submissionId, {
    recommendation: v.recommendation ?? null,
  });
  revalidatePath(`/faculty/submissions/${submissionId}`);
  revalidatePath("/faculty/dashboard");
  return { ok: true, message: v.intent === "submit" ? "Evaluation submitted. Thank you!" : "Draft saved.", errors: {} };
}
