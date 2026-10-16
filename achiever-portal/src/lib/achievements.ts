import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, isSupabaseConfigured, appTimeZone } from "@/lib/env";
import { todayISO } from "@/lib/dates";
import { demoAchievers, demoByCategory, demoRecent } from "@/lib/demo-data";
import { rowsOf, type Category, type PeriodType, type PublicAchiever } from "@/lib/types";

// Only the columns the database grants to the public (see 0003_rls.sql).
const PUBLIC_COLUMNS =
  "id, rank, display_name, initials, achievement_title, category, public_remark, period_type, period_start, is_demo";

interface PublicRow {
  id: string;
  rank: number;
  display_name: string;
  initials: string;
  achievement_title: string;
  category: Category;
  public_remark: string | null;
  period_type: PeriodType;
  period_start: string;
  is_demo: boolean;
}

function mapRow(r: PublicRow): PublicAchiever {
  return {
    id: r.id,
    rank: r.rank,
    displayName: r.display_name,
    initials: r.initials,
    title: r.achievement_title,
    category: r.category,
    publicRemark: r.public_remark,
    periodType: r.period_type,
    periodStart: r.period_start,
    isDemo: r.is_demo,
  };
}

export function usingDemoData(): boolean {
  return isDemoMode() || !isSupabaseConfigured();
}

export function today(): string {
  return todayISO(appTimeZone());
}

export type FetchResult = { items: PublicAchiever[]; error: string | null };

export async function getPeriodAchievers(mode: PeriodType, periodStart: string): Promise<FetchResult> {
  if (usingDemoData()) return { items: demoAchievers(mode, periodStart, today()), error: null };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("achievements")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("is_demo", false)
      .eq("period_type", mode)
      .eq("period_start", periodStart)
      .order("rank", { ascending: true });
    if (error) throw error;
    return { items: rowsOf<PublicRow>(data).map(mapRow), error: null };
  } catch (e) {
    console.error("[achievements] period query failed", e);
    return { items: [], error: "Achievements could not be loaded right now. Please try again shortly." };
  }
}

export async function getRecentAchievers(limit = 5): Promise<PublicAchiever[]> {
  if (usingDemoData()) return demoRecent(today()).slice(0, limit);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("achievements")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("is_demo", false)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return rowsOf<PublicRow>(data).map(mapRow);
  } catch (e) {
    console.error("[achievements] recent query failed", e);
    return [];
  }
}

export async function getByCategory(category: Category, limit: number): Promise<PublicAchiever[]> {
  if (usingDemoData()) return demoByCategory(category, today(), limit);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("achievements")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .eq("is_demo", false)
      .eq("category", category)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return rowsOf<PublicRow>(data).map(mapRow);
  } catch (e) {
    console.error("[achievements] category query failed", e);
    return [];
  }
}

export async function searchArchive(opts: {
  q: string;
  category: string;
  page: number;
  pageSize: number;
}): Promise<{ items: PublicAchiever[]; total: number; error: string | null }> {
  if (usingDemoData()) {
    const t = today();
    const all: PublicAchiever[] = [];
    for (let k = 0; k < 14; k++) {
      const d = new Date(Date.parse(t + "T00:00:00Z") - k * 86400000).toISOString().slice(0, 10);
      all.push(...demoAchievers("day", d, t));
    }
    const q = opts.q.toLowerCase();
    const filtered = all.filter(
      (a) =>
        (!q || a.displayName.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)) &&
        (!opts.category || a.category === opts.category),
    );
    const start = (opts.page - 1) * opts.pageSize;
    return { items: filtered.slice(start, start + opts.pageSize), total: filtered.length, error: null };
  }
  try {
    const supabase = await createClient();
    let query = supabase
      .from("achievements")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .eq("is_demo", false);
    if (opts.category) query = query.eq("category", opts.category);
    if (opts.q) {
      // Strip characters that have meaning in PostgREST filter syntax.
      const safe = opts.q.replace(/[%,()*\\]/g, " ").trim();
      if (safe) query = query.or(`display_name.ilike.%${safe}%,achievement_title.ilike.%${safe}%`);
    }
    const from = (opts.page - 1) * opts.pageSize;
    const { data, error, count } = await query
      .order("period_start", { ascending: false })
      .order("rank", { ascending: true })
      .range(from, from + opts.pageSize - 1);
    if (error) throw error;
    return { items: rowsOf<PublicRow>(data).map(mapRow), total: count ?? 0, error: null };
  } catch (e) {
    console.error("[achievements] archive query failed", e);
    return { items: [], total: 0, error: "The archive could not be loaded right now." };
  }
}
