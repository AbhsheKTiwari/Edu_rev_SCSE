import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Secure evidence download.
 * 1. Requires a signed-in, active user.
 * 2. Reads the file row THROUGH RLS — it is only returned to the owner,
 *    the admin, or faculty assigned to that submission.
 * 3. Only then creates a 60-second signed URL with the service role.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { supabase, user, profile } = await getSession();
  if (!supabase || !user || !profile || profile.access_status !== "active") {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { data } = await supabase
    .from("submission_files")
    .select("id, storage_path, original_name, submission_id")
    .eq("id", id)
    .maybeSingle();
  const file = data as { id: string; storage_path: string; original_name: string; submission_id: string } | null;
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("evidence")
    .createSignedUrl(file.storage_path, 60, { download: file.original_name });
  if (error || !signed) return NextResponse.json({ error: "File unavailable" }, { status: 500 });

  if (profile.role !== "student") {
    await logAudit(user.id, "evidence.downloaded", "submission_file", file.id, { submission_id: file.submission_id });
  }

  const res = NextResponse.redirect(signed.signedUrl, { status: 302 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
