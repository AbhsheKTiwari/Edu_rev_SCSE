"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, otpSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";

export type PortalKind = "student" | "faculty" | "admin" | "invite";

export interface OtpState {
  step: "email" | "code";
  email: string;
  message: string | null;
  error: string | null;
}

const NEXT_FOR: Record<PortalKind, string> = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin: "/admin/dashboard",
  invite: "/faculty/invite",
};

function portalOf(v: FormDataEntryValue | null): PortalKind {
  return v === "faculty" || v === "admin" || v === "invite" ? v : "student";
}

/** Step 1: email the one-time code (and magic link). */
export async function sendOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const portal = portalOf(formData.get("portal"));
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { step: "email", email: "", message: null, error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const email = parsed.data;
  if (!isSupabaseConfigured()) {
    return { step: "email", email, message: null, error: "Sign-in is not available: Supabase is not configured yet." };
  }

  const domain = process.env.ALLOWED_STUDENT_EMAIL_DOMAIN?.trim().toLowerCase();
  if (portal === "student" && domain && !email.endsWith("@" + domain)) {
    return { step: "email", email, message: null, error: `Please use your @${domain} email address.` };
  }

  const ip = await clientIp();
  const okIp = await rateLimit(`otp:ip:${ip}`, 10, 15 * 60);
  const okEmail = await rateLimit(`otp:email:${email}`, 5, 15 * 60);
  if (!okIp || !okEmail) {
    return { step: "email", email, message: null, error: "Too many attempts. Please wait 15 minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Only students (and invited faculty) may create new accounts. Admin and faculty
      // login never creates accounts, so nobody can self-register into those portals.
      shouldCreateUser: portal === "student" || portal === "invite",
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(NEXT_FOR[portal])}`,
    },
  });

  if (error) {
    // Do not reveal whether an account exists.
    console.error("[auth] signInWithOtp", error.message);
    if (portal === "faculty" || portal === "admin") {
      return {
        step: "code",
        email,
        message: "If this email has an account, a sign-in code has been sent. Check your inbox and spam folder.",
        error: null,
      };
    }
    return { step: "email", email, message: null, error: "We could not send the code. Please try again in a minute." };
  }

  return {
    step: "code",
    email,
    message: "We emailed you a sign-in code. Enter it below, or click the link in the email.",
    error: null,
  };
}

/** Step 2: verify the code. Session cookies are set by the server client. */
export async function verifyOtp(_prev: OtpState, formData: FormData): Promise<OtpState> {
  const portal = portalOf(formData.get("portal"));
  const email = emailSchema.safeParse(formData.get("email"));
  const token = otpSchema.safeParse(formData.get("token"));
  if (!email.success) return { step: "email", email: "", message: null, error: "Enter your email again." };
  if (!token.success) {
    return { step: "code", email: email.data, message: null, error: token.error.issues[0]?.message ?? "Invalid code." };
  }

  const ip = await clientIp();
  if (!(await rateLimit(`verify:ip:${ip}`, 20, 15 * 60)) || !(await rateLimit(`verify:email:${email.data}`, 8, 15 * 60))) {
    return { step: "code", email: email.data, message: null, error: "Too many attempts. Please wait 15 minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: token.data, type: "email" });
  if (error) {
    return { step: "code", email: email.data, message: null, error: "That code is incorrect or has expired. Request a new one." };
  }
  redirect(NEXT_FOR[portal]);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
