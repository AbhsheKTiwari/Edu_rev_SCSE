// Environment helpers. Only NEXT_PUBLIC_* values are available in the browser.

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function supabaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return v;
}

export function supabaseAnonKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  return v;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function appTimeZone(): string {
  return process.env.APP_TIMEZONE || "Asia/Kolkata";
}

export const portalName = process.env.NEXT_PUBLIC_PORTAL_NAME || "Achievers' Hall";
export const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || "[Institution name]";
export const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || "";
