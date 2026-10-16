import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP from Vercel's proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip"))?.trim() || "unknown";
}

/**
 * Returns true if the action is allowed. Uses a fixed window counter in Postgres
 * (works across all serverless instances). Fails CLOSED if the check errors.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit]", error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit]", e);
    return false;
  }
}
