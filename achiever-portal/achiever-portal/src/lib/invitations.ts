import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Faculty invitation codes.
 * - 120 bits of randomness from the operating system's secure generator.
 * - Shown to the admin ONCE. Only an HMAC-SHA256 hash (keyed with
 *   INVITE_CODE_SECRET) is stored, so a database leak does not reveal codes.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export function generateInviteCode(): string {
  const bytes = randomBytes(24);
  let out = "";
  for (let i = 0; i < 24; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  // 24 chars × 5 bits = 120 bits; grouped for readability: XXXX-XXXX-...
  return out.match(/.{1,4}/g)!.join("-");
}

export function normalizeInviteCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(code: string, secret: string): string {
  if (!secret || secret.length < 32) throw new Error("INVITE_CODE_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(normalizeInviteCode(code)).digest("hex");
}

export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const REDEEM_MESSAGES: Record<string, string> = {
  ok: "Invitation accepted. You now have faculty access.",
  invalid: "That invitation code is not valid.",
  revoked: "This invitation has been revoked.",
  expired: "This invitation has expired. Ask the administrator for a new one.",
  used: "This invitation has already been used.",
  email_mismatch: "This invitation was issued for a different email address.",
  domain_mismatch: "This invitation is limited to a different email domain.",
  already_admin: "Administrator accounts cannot redeem faculty invitations.",
  already_faculty: "You already have faculty access.",
  has_student_submissions: "This account has student submissions. Please sign in with your faculty email instead.",
  email_not_verified: "Verify your email address first.",
  not_authenticated: "Please sign in first.",
};
