"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client — used only for direct-to-storage evidence uploads. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
