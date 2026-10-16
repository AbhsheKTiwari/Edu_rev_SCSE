"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole, requireOnboardedStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, onboardingSchema, submissionSchema } from "@/lib/validation";
import { contentMatchesExtension, MAX_FILES_PER_SUBMISSION, sanitizeFileName, typeForExtension, validateFileMeta } from "@/lib/files";
import { rateLimit } from "@/lib/rate-limit";
import { loadSettings, submissionsAreOpen } from "@/lib/settings";
import { todayISO } from "@/lib/dates";
import { appTimeZone } from "@/lib/env";

export interface FormState {
  ok: boolean;
  message: string | null;
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------
// Onboarding: VID + full name (only on the signed-in user's own profile)
// ---------------------------------------------------------------------
export async function saveOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireRole("student");
  const parsed = onboardingSchema.safeParse({ fullName: formData.get("fullName"), vid: formData.get("vid") });
  if (!parsed.success) return { ok: false, message: null, errors: fieldErrors(parsed.error) };

  if (profile.vid && profile.vid.toUpperCase() !== parsed.data.vid) {
    return { ok: false, message: null, errors: { vid: "Your VID is already saved and cannot be changed here." } };
  }

  // The user id comes from the verified session — never from the form.
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, vid: parsed.data.vid, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { ok: false, message: null, errors: { vid: "This VID is already registered to another account." } };
    console.error("[onboarding]", error.message);
    return { ok: false, message: "We could not save your details. Please try again.", errors: {} };
  }
  revalidatePath("/student", "layout");
  redirect("/student/dashboard?notice=Profile+saved");
}

// ---------------------------------------------------------------------
// Create submission (files are uploaded afterwards, directly to private storage)
// ---------------------------------------------------------------------
export interface CreateSubmissionState extends FormState {
  submissionId: string | null;
  uploadPrefix: string | null;
}

export async function createSubmission(_prev: CreateSubmissionState, formData: FormData): Promise<CreateSubmissionState> {
  const { supabase, user } = await requireOnboardedStudent();
  const fail = (message: string | null, errors: Record<string, string> = {}): CreateSubmissionState => ({
    ok: false,
    message,
    errors,
    submissionId: null,
    uploadPrefix: null,
  });

  if (!(await rateLimit(`submit:${user.id}`, 10, 60 * 60))) return fail("Too many submissions in the last hour. Please try later.");

  const settings = await loadSettings(supabase);
  if (!submissionsAreOpen(settings)) return fail("Submissions are currently closed.");

  const today = todayISO(appTimeZone());
  const parsed = submissionSchema(today).safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    teamMembers: formData.get("teamMembers") ?? "",
    submissionDate: formData.get("submissionDate"),
    publicSummary: formData.get("publicSummary") ?? "",
    projectUrl: formData.get("projectUrl") ?? "",
    declaration: formData.get("declaration"),
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const d = parsed.data;

  // student_id is forced to the session user; VID/name are copied from the profile by a DB trigger.
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      student_id: user.id,
      student_vid: "pending",
      student_name: "pending",
      title: d.title,
      description: d.description,
      category: d.category,
      team_members: d.teamMembers,
      submission_date: d.submissionDate,
      public_summary: d.publicSummary,
      project_url: d.projectUrl,
      declaration_accepted: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") return fail(null, { title: "You already submitted a project with this title on this date." });
    console.error("[submission] insert", error?.message);
    return fail(error?.message?.includes("closed") || error?.message?.includes("limit") ? error.message : "We could not save your submission. Please try again.");
  }

  const id = (data as { id: string }).id;
  return { ok: true, message: null, errors: {}, submissionId: id, uploadPrefix: `${user.id}/${id}/` };
}

/** Returns a safe storage path for the next upload (random name, correct extension). */
export async function prepareUpload(submissionId: string, fileName: string, size: number): Promise<{ path: string | null; error: string | null }> {
  const { supabase, user } = await requireOnboardedStudent();
  const settings = await loadSettings(supabase);
  const problem = validateFileMeta(fileName, size, settings.max_upload_mb * 1048576);
  if (problem) return { path: null, error: problem };

  const { data: sub } = await supabase.from("submissions").select("id, student_id").eq("id", submissionId).maybeSingle();
  if (!sub || (sub as { student_id: string }).student_id !== user.id) return { path: null, error: "Submission not found." };

  const { count } = await supabase.from("submission_files").select("id", { count: "exact", head: true }).eq("submission_id", submissionId);
  if ((count ?? 0) >= MAX_FILES_PER_SUBMISSION) return { path: null, error: `A submission can have at most ${MAX_FILES_PER_SUBMISSION} files.` };

  const ext = typeForExtension(fileName)!.ext[0];
  return { path: `${user.id}/${submissionId}/${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`, error: null };
}

/**
 * After the browser uploads to private storage, the server re-checks everything:
 * ownership, path, size and the REAL content type (magic bytes). Invalid files are deleted.
 */
export async function registerUploadedFile(
  submissionId: string,
  storagePath: string,
  originalName: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { supabase, user } = await requireOnboardedStudent();
  const admin = createAdminClient();

  const expectedPrefix = `${user.id}/${submissionId}/`;
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..") || !/^[\w-]+\/[\w-]+\/[\w-]+\.[a-z]+$/.test(storagePath)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const { data: sub } = await supabase.from("submissions").select("id, student_id").eq("id", submissionId).maybeSingle();
  if (!sub || (sub as { student_id: string }).student_id !== user.id) return { ok: false, error: "Submission not found." };

  const settings = await loadSettings(supabase);
  const { data: blob, error: dlError } = await admin.storage.from("evidence").download(storagePath);
  if (dlError || !blob) return { ok: false, error: "Upload not found. Please try again." };

  const size = blob.size;
  const safeName = sanitizeFileName(originalName);
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const metaProblem = validateFileMeta(safeName, size, settings.max_upload_mb * 1048576);
  const type = typeForExtension(safeName);
  const storedExt = storagePath.split(".").pop() ?? "";

  const extMatches = type !== null && type.ext.includes(storedExt);
  if (metaProblem || !type || !extMatches || !contentMatchesExtension(safeName, head)) {
    await admin.storage.from("evidence").remove([storagePath]);
    return { ok: false, error: metaProblem ?? `"${safeName}" does not look like a real ${type?.label ?? "allowed file"}. It was rejected.` };
  }

  const { error } = await admin.from("submission_files").insert({
    submission_id: submissionId,
    storage_path: storagePath,
    original_name: safeName,
    mime_type: type.mime,
    size_bytes: size,
    uploaded_by: user.id,
  });
  if (error) {
    await admin.storage.from("evidence").remove([storagePath]);
    console.error("[files] insert", error.message);
    return { ok: false, error: "Could not record the file. Please try again." };
  }
  revalidatePath(`/student/submissions/${submissionId}`);
  return { ok: true, error: null };
}
