import { appTimeZone } from "@/lib/env";

// Server-rendered timestamps must use the app's time zone (Vercel servers run in UTC).

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { timeZone: appTimeZone(), dateStyle: "medium", timeStyle: "short" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: appTimeZone(), dateStyle: "medium" });
}
