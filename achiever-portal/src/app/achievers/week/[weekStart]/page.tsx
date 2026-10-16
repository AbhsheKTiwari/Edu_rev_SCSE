import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { AchieversSection } from "@/components/achievers/achievers-section";
import { getPeriodAchievers, today } from "@/lib/achievements";
import { formatWeekRange, isValidISODate, weekStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = Promise<{ weekStart: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { weekStart: ws } = await params;
  return { title: isValidISODate(ws) ? `Week of ${formatWeekRange(weekStart(ws))}` : "Weekly achievers" };
}

export default async function WeekPage({ params }: { params: Params }) {
  const { weekStart: raw } = await params;
  if (!isValidISODate(raw)) notFound();
  const t = today();
  const start = weekStart(raw);
  // Any day of a week is accepted; redirect so the shareable URL is always the Monday.
  if (start !== raw) redirect(`/achievers/week/${start}`);
  if (start > weekStart(t)) redirect(`/achievers/week/${weekStart(t)}`);

  const res = await getPeriodAchievers("week", start);
  return (
    <PublicShell>
      <AchieversSection mode="week" date={start} today={t} items={res.items} error={res.error} />
    </PublicShell>
  );
}
