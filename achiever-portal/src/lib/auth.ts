import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface SessionContext {
  supabase: ServerSupabase;
  user: User;
  profile: Profile;
}

const PROFILE_COLUMNS = "id, email, role, access_status, full_name, vid, onboarded_at";

/** Reads the verified user (getUser() validates the JWT with Supabase Auth) and their profile. */
export async function getSession(): Promise<{ supabase: ServerSupabase | null; user: User | null; profile: Profile | null }> {
  if (!isSupabaseConfigured()) return { supabase: null, user: null, profile: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (data as Profile | null) ?? null };
}

export const LOGIN_PATHS: Record<Role, string> = {
  student: "/student/login",
  faculty: "/faculty/login",
  admin: "/admin/login",
};

export const HOME_PATHS: Record<Role, string> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin: "/admin/dashboard",
};

/**
 * Server-side gate used by every protected layout, page and action.
 * Never trust the URL, a hidden link, or a role value sent by the browser.
 */
export async function requireRole(role: Role): Promise<SessionContext> {
  if (!isSupabaseConfigured()) redirect("/unauthorized?reason=not-configured");
  const { supabase, user, profile } = await getSession();
  if (!supabase || !user) redirect(LOGIN_PATHS[role]);
  if (!profile || profile.access_status !== "active" || profile.role !== role) redirect("/unauthorized");
  return { supabase, user, profile };
}

/** Student who has completed onboarding (VID + full name). */
export async function requireOnboardedStudent(): Promise<SessionContext> {
  const ctx = await requireRole("student");
  if (!ctx.profile.vid || !ctx.profile.full_name) redirect("/student/onboarding");
  return ctx;
}
