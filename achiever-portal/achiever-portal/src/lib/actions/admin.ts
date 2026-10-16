"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { achievementSchema, fieldErrors, inviteSchema, settingsSchema } from "@/lib/validation";
import { generateInviteCode, hashInviteCode } from "@/lib/invitations";
import { initialsOf } from "@/lib/podium";
import { isMonday, zonedLocalToISO } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function back(path: string, kind: "notice" | "error", msg: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}

function safeReturn(fd: FormData, fallback: string): string {
  const r = str(fd, "returnTo");
  return r.startsWith("/admin/") && !r.startsWith("//") ? r : fallback;
}

// ---------------------------------------------------------------------
// Reviewer assignment
// ---------------------------------------------------------------------
export async function assignReviewers(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole("admin");
  const submissionId = str(formData, "submissionId");
  const returnTo = safeReturn(formData, `/admin/submissions/${submissionId}`);
  if (!UUID_RE.test(submissionId)) back(returnTo, "error", "Invalid submission.");

  const facultyIds = formData.getAll("facultyIds").map(String).filter((v) => UUID_RE.test(v));
  const dueRaw = str(formData, "dueAt");
  const dueAt = dueRaw ? zonedLocalToISO(dueRaw, appTimeZone()) : null;
  if (facultyIds.length === 0) back(returnTo, "error", "Choose at least one faculty reviewer.");

  // Only active faculty can be assigned (checked server-side, not trusted from the form).
  const { data: valid } = await supabase.from("profiles").select("id").in("id", facultyIds).eq("role", "faculty").eq("access_status", "active");
  const validIds = ((valid ?? []) as { id: string }[]).map((v) => v.id);
  if (validIds.length === 0) back(returnTo, "error", "Selected reviewers are not active faculty.");

  const { error } = await supabase
    .from("evaluation_assignments")
    .upsert(
      validIds.map((fid) => ({ submission_id: submissionId, faculty_id: fid, assigned_by: user.id, due_at: dueAt })),
      { onConflict: "submission_id,faculty_id" },
    );
  if (error) back(returnTo, "error", "Could not assign reviewers.");

  await logAudit(user.id, "assignment.created", "submission", submissionId, { faculty_ids: validIds, due_at: dueAt });
  revalidatePath("/admin", "layout");
  back(returnTo, "notice", `Assigned ${validIds.length} reviewer(s).`);
}

export async function removeAssignment(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole("admin");
  const assignmentId = str(formData, "assignmentId");
  const submissionId = str(formData, "submissionId");
  const returnTo = safeReturn(formData, `/admin/submissions/${submissionId}`);
  if (!UUID_RE.test(assignmentId)) back(returnTo, "error", "Invalid assignment.");

  const { error } = await supabase.from("evaluation_assignments").delete().eq("id", assignmentId);
  if (error) back(returnTo, "error", "Could not remove reviewer.");
  await logAudit(user.id, "assignment.removed", "submission", submissionId || null, { assignment_id: assignmentId });
  revalidatePath("/admin", "layout");
  back(returnTo, "notice", "Reviewer removed. Their evaluation (if any) is kept for the record.");
}

// ---------------------------------------------------------------------
// Eligibility (with audit trail)
// ---------------------------------------------------------------------
export async function setEligibility(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole("admin");
  const submissionId = str(formData, "submissionId");
  const decision = str(formData, "decision");
  const reason = str(formData, "reason").slice(0, 1000);
  const returnTo = safeReturn(formData, `/admin/submissions/${submissionId}`);
  if (!UUID_RE.test(submissionId) || !["eligible", "ineligible", "under_review"].includes(decision)) back(returnTo, "error", "Invalid request.");
  if (decision === "ineligible" && reason.length < 5) back(returnTo, "error", "Give a reason (5+ characters) when marking ineligible.");

  const { error } = await supabase
    .from("submissions")
    .update({
      status: decision,
      eligibility_reason: reason || null,
      eligibility_decided_by: user.id,
      eligibility_decided_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .neq("status", "published");
  if (error) back(returnTo, "error", "Could not update eligibility.");

  await logAudit(user.id, `submission.${decision}`, "submission", submissionId, { reason });
  revalidatePath("/admin", "layout");
  back(returnTo, "notice", `Submission marked ${decision.replace("_", " ")}.`);
}

// ---------------------------------------------------------------------
// Reopen a final evaluation (explicit, audited admin workflow)
// ---------------------------------------------------------------------
export async function reopenEvaluation(formData: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const evaluationId = str(formData, "evaluationId");
  const submissionId = str(formData, "submissionId");
  const reason = str(formData, "reason").slice(0, 500);
  const returnTo = safeReturn(formData, `/admin/submissions/${submissionId}`);
  if (!UUID_RE.test(evaluationId)) back(returnTo, "error", "Invalid evaluation.");
  if (reason.length < 5) back(returnTo, "error", "Give a reason (5+ characters) for reopening.");

  const admin = createAdminClient(); // service role: bypasses the "final evaluations are locked" trigger
  const { error } = await admin
    .from("evaluations")
    .update({ status: "draft", submitted_at: null, reopened_at: new Date().toISOString(), reopened_by: user.id })
    .eq("id", evaluationId)
    .eq("status", "submitted");
  if (error) back(returnTo, "error", "Could not reopen the evaluation.");

  await logAudit(user.id, "evaluation.reopened", "evaluation", evaluationId, { submission_id: submissionId, reason });
  revalidatePath("/admin", "layout");
  back(returnTo, "notice", "Evaluation reopened as a draft. The reviewer can now edit and resubmit it.");
}

// ---------------------------------------------------------------------
// Faculty invitations & access
// ---------------------------------------------------------------------
export interface InviteState {
  ok: boolean;
  code: string | null;
  message: string | null;
  errors: Record<string, string>;
}

export async function createInvitation(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user } = await requireRole("admin");
  const parsed = inviteSchema.safeParse({
    email: formData.get("email") ?? "",
    emailDomain: formData.get("emailDomain") ?? "",
    expiresInDays: formData.get("expiresInDays"),
    maxUses: formData.get("maxUses"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, code: null, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };

  const secret = process.env.INVITE_CODE_SECRET ?? "";
  const code = generateInviteCode();
  let codeHash: string;
  try {
    codeHash = hashInviteCode(code, secret);
  } catch {
    return { ok: false, code: null, message: "INVITE_CODE_SECRET is missing or shorter than 32 characters.", errors: {} };
  }

  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86400000).toISOString();
  const { data, error } = await admin
    .from("access_invitations")
    .insert({
      code_hash: codeHash,
      email: parsed.data.email,
      email_domain: parsed.data.emailDomain,
      expires_at: expiresAt,
      max_uses: parsed.data.maxUses,
      note: parsed.data.note,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[invite] insert", error?.message);
    return { ok: false, code: null, message: "Could not create the invitation.", errors: {} };
  }

  await logAudit(user.id, "invitation.created", "access_invitation", (data as { id: string }).id, {
    email: parsed.data.email,
    email_domain: parsed.data.emailDomain,
    expires_at: expiresAt,
    max_uses: parsed.data.maxUses,
  });
  revalidatePath("/admin/faculty");
  // The plain code is returned ONCE to the admin's browser and never stored.
  return { ok: true, code, message: null, errors: {} };
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(formData, "invitationId");
  if (!UUID_RE.test(id)) back("/admin/faculty", "error", "Invalid invitation.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("access_invitations")
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) back("/admin/faculty", "error", "Could not revoke the invitation.");
  await logAudit(user.id, "invitation.revoked", "access_invitation", id);
  revalidatePath("/admin/faculty");
  back("/admin/faculty", "notice", "Invitation revoked.");
}

export async function setFacultyAccess(formData: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const facultyId = str(formData, "facultyId");
  const action = str(formData, "action");
  if (!UUID_RE.test(facultyId) || !["revoke", "restore"].includes(action)) back("/admin/faculty", "error", "Invalid request.");
  if (facultyId === user.id) back("/admin/faculty", "error", "You cannot change your own access.");

  const admin = createAdminClient(); // role/access changes are allowed only through the service role
  const { error } = await admin
    .from("profiles")
    .update({ access_status: action === "revoke" ? "revoked" : "active" })
    .eq("id", facultyId)
    .eq("role", "faculty");
  if (error) back("/admin/faculty", "error", "Could not update access.");
  await logAudit(user.id, `faculty.${action}d`, "profile", facultyId);
  revalidatePath("/admin/faculty");
  back("/admin/faculty", "notice", action === "revoke" ? "Faculty access revoked." : "Faculty access restored.");
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
export async function updateSettings(formData: FormData): Promise<void> {
  const { supabase, user } = await requireRole("admin");
  const parsed = settingsSchema.safeParse({
    submissionsOpen: formData.get("submissionsOpen") ?? undefined,
    submissionDeadline: formData.get("submissionDeadline") ?? "",
    maxSubmissionsPerDay: formData.get("maxSubmissionsPerDay") ?? "",
    rankingMethod: formData.get("rankingMethod"),
    voteWeight: formData.get("voteWeight"),
    minEvaluations: formData.get("minEvaluations"),
    rubricEnabled: formData.get("rubricEnabled") ?? undefined,
  });
  if (!parsed.success) back("/admin/settings", "error", parsed.error.issues[0]?.message ?? "Invalid settings.");
  const s = parsed.data;
  const { error } = await supabase
    .from("app_settings")
    .update({
      submissions_open: s.submissionsOpen,
      submission_deadline: s.submissionDeadline ? zonedLocalToISO(s.submissionDeadline, appTimeZone()) : null,
      max_submissions_per_day: s.maxSubmissionsPerDay,
      ranking_method: s.rankingMethod,
      vote_weight: s.voteWeight,
      min_evaluations: s.minEvaluations,
      rubric_enabled: s.rubricEnabled,
      updated_by: user.id,
    })
    .eq("id", true);
  if (error) back("/admin/settings", "error", "Could not save settings.");
  await logAudit(user.id, "settings.updated", "app_settings", null, s as unknown as Record<string, unknown>);
  revalidatePath("/admin", "layout");
  back("/admin/settings", "notice", "Settings saved.");
}

// ---------------------------------------------------------------------
// Winners: create draft → preview → publish / unpublish
// ---------------------------------------------------------------------
export async function createAchievement(formData: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const returnTo = safeReturn(formData, "/admin/winners");
  const parsed = achievementSchema.safeParse({
    submissionId: formData.get("submissionId"),
    periodType: formData.get("periodType"),
    periodStart: formData.get("periodStart"),
    rank: formData.get("rank"),
    publicRemark: formData.get("publicRemark") ?? "",
    rationale: formData.get("rationale"),
  });
  if (!parsed.success) back(returnTo, "error", Object.values(fieldErrors(parsed.error))[0] ?? "Invalid input.");
  const v = parsed.data;
  if (v.periodType === "week" && !isMonday(v.periodStart)) back(returnTo, "error", "Weekly periods must start on a Monday.");

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select("id, student_id, student_name, title, category, status")
    .eq("id", v.submissionId)
    .maybeSingle();
  const s = sub as { id: string; student_id: string; student_name: string; title: string; category: string; status: string } | null;
  if (!s) back(returnTo, "error", "Submission not found.");
  if (s.status !== "eligible" && s.status !== "published") back(returnTo, "error", "Only submissions marked eligible can be selected as winners.");

  const { data, error } = await admin
    .from("achievements")
    .insert({
      submission_id: s.id,
      student_id: s.student_id,
      period_type: v.periodType,
      period_start: v.periodStart,
      rank: v.rank,
      display_name: s.student_name,
      initials: initialsOf(s.student_name),
      achievement_title: s.title.slice(0, 160),
      category: s.category,
      public_remark: v.publicRemark,
      selection_rationale: v.rationale,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    back(returnTo, "error", error?.code === "23505" ? "This submission already has an entry for that period." : "Could not create the winner entry.");
  }
  await logAudit(user.id, "achievement.drafted", "achievement", (data as { id: string }).id, {
    submission_id: s.id,
    period_type: v.periodType,
    period_start: v.periodStart,
    rank: v.rank,
    rationale: v.rationale,
  });
  revalidatePath("/admin/winners");
  back(returnTo, "notice", "Draft winner created. Preview it below, then publish.");
}

export async function setAchievementStatus(formData: FormData): Promise<void> {
  const { user } = await requireRole("admin");
  const id = str(formData, "achievementId");
  const action = str(formData, "action");
  const returnTo = safeReturn(formData, "/admin/winners");
  if (!UUID_RE.test(id) || !["publish", "unpublish", "delete"].includes(action)) back(returnTo, "error", "Invalid request.");

  const admin = createAdminClient();
  const { data: a } = await admin.from("achievements").select("id, status, submission_id").eq("id", id).maybeSingle();
  const ach = a as { id: string; status: string; submission_id: string | null } | null;
  if (!ach) back(returnTo, "error", "Entry not found.");

  if (action === "delete") {
    if (ach.status === "published") back(returnTo, "error", "Unpublish before deleting.");
    await admin.from("achievements").delete().eq("id", id);
    await logAudit(user.id, "achievement.deleted", "achievement", id);
    revalidatePath("/admin/winners");
    back(returnTo, "notice", "Draft deleted.");
  }

  const publish = action === "publish";
  const { error } = await admin
    .from("achievements")
    .update(publish ? { status: "published", published_at: new Date().toISOString(), published_by: user.id } : { status: "unpublished" })
    .eq("id", id);
  if (error) {
    back(returnTo, "error", error.code === "23505" ? "Another published winner already holds that rank for this period." : "Could not update the entry.");
  }

  if (ach.submission_id) {
    if (publish) {
      await admin.from("submissions").update({ status: "published" }).eq("id", ach.submission_id);
    } else {
      const { count } = await admin
        .from("achievements")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", ach.submission_id)
        .eq("status", "published");
      if (!count) await admin.from("submissions").update({ status: "eligible" }).eq("id", ach.submission_id);
    }
  }

  await logAudit(user.id, publish ? "achievement.published" : "achievement.unpublished", "achievement", id);
  revalidatePath("/", "layout");
  back(returnTo, "notice", publish ? "Published to the homepage." : "Removed from the homepage.");
}
